import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { getModelToken } from '@nestjs/mongoose';
import { Attendance } from './schemas/attendance.schema';
import { ConflictException, BadRequestException } from '@nestjs/common';

// 建立 Mock Model 物件，模擬 Mongoose Model 的行為
const mockAttendanceModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

/**
 * 模擬 Mongoose Document 實例
 * 用於模擬資料庫回傳的具體資料物件，並包含 save 方法
 */
class MockAttendanceDoc {
  userId: string;
  checkIn: Date;
  checkOut: Date;
  duration: number;

  // 模擬 save 方法，呼叫時直接回傳自己 (Promise)
  save = jest.fn().mockResolvedValue(this);

  constructor(init?: Partial<MockAttendanceDoc>) {
    Object.assign(this, init);
  }
}

describe('AttendanceService', () => {
  let service: AttendanceService;
  let model: any;

  beforeEach(async () => {
    // 建立測試模組
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          // 使用 getModelToken 注入 Mock Model
          provide: getModelToken(Attendance.name),
          useValue: mockAttendanceModel,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    model = module.get(getModelToken(Attendance.name));

    // 每次測試前重置 Mock 狀態，避免測試互相干擾
    jest.clearAllMocks();

    // 攔截 Service 內部的 `new this.attendanceModel(...)` 建構子行為
    // 強制使其回傳我們的 MockAttendanceDoc 實例，以便我們可以監控 save 方法
    // @ts-ignore
    service.attendanceModel = jest
      .fn()
      .mockImplementation((dto) => new MockAttendanceDoc(dto));
    
    // 因為覆寫了 attendanceModel，需重新將 findOne 綁定回 mockAttendanceModel
    service['attendanceModel'].findOne = model.findOne;
  });

  /**
   * 測試案例：重複上班打卡 (Duplicate Check-in)
   *
   * 情境：使用者目前已有「未下班」的紀錄 (active session)。
   * 預期：Service 應拋出 ConflictException (HTTP 409)，阻止重複打卡。
   */
  it('should throw ConflictException when checking in twice', async () => {
    // Arrange: 模擬資料庫已有一筆該使用者的紀錄 (userId: 'user_001')
    model.findOne.mockResolvedValue(
      new MockAttendanceDoc({ userId: 'user_001' }),
    );

    // Act & Assert: 呼叫 checkIn 並預期拋出異常
    await expect(service.checkIn()).rejects.toThrow(ConflictException);
  });

  /**
   * 測試案例：無效下班打卡 (Invalid Check-out)
   *
   * 情境：使用者目前「沒有」任何進行中的紀錄 (可能已下班或從未打卡)。
   * 預期：Service 應拋出 BadRequestException (HTTP 400)。
   */
  it('should throw BadRequestException when checking out without active session', async () => {
    // Arrange: 模擬資料庫找不到任何進行中的紀錄 (回傳 null)
    model.findOne.mockResolvedValue(null);

    // Act & Assert: 呼叫 checkOut 並預期拋出異常
    await expect(service.checkOut()).rejects.toThrow(BadRequestException);
  });

  /**
   * 測試案例：成功下班並計算工時 (Success Check-out with Duration Calculation)
   *
   * 情境：使用者有進行中的紀錄，且打卡時間為 10 秒前。
   * 預期：
   * 1. Service 成功回傳更新後的紀錄。
   * 2. checkOut 時間欄位應被設定。
   * 3. duration (工時) 應正確計算為約 10 秒。
   */
  it('should calculate duration correctly on check out', async () => {
    // Arrange: 模擬一筆 10 秒前建立的打卡紀錄
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10000);
    const mockDoc = new MockAttendanceDoc({ checkIn: tenSecondsAgo });
    
    // 設定 Mock 回傳此紀錄
    model.findOne.mockResolvedValue(mockDoc);

    // Act: 執行下班
    const result = await service.checkOut();

    // Assert: 驗證結果
    expect(result.checkOut).toBeDefined(); // 結束時間應存在
    expect(result.duration).toBeGreaterThanOrEqual(10); // 工時應 >= 10 秒
  });
});