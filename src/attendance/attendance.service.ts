import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';

/**
 * 負責處理出勤相關的商業邏輯
 * 包含：打卡、簽退、工時計算與紀錄查詢
 */
@Injectable()
export class AttendanceService {
  // 模擬單一使用者 ID (實際專案應從 JWT 或 Request Context 取得)
  private readonly MOCK_USER_ID = 'user_001';

  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
  ) {}

  /**
     * 取得當前使用者狀態
     */
  private async getActiveSession(): Promise<AttendanceDocument | null> {
    return this.attendanceModel.findOne({
      userId: this.MOCK_USER_ID,
      checkOut: null,
    });
  }

  /**
   * 執行上班打卡 (Check-in)
   *
   * 檢查該使用者是否已有「進行中 (Active)」的會話。
   * 若有未結案的紀錄，則視為重複打卡，拋出異常。
   *
   * @throws {ConflictException} 當使用者目前已在上班狀態時拋出 (HTTP 409)
   * @returns {Promise<Attendance>} 回傳新建立的打卡紀錄
   */
  async checkIn(): Promise<Attendance> {
    // 檢查是否存在 checkOut 為 null 的紀錄
    const activeSession = await this.getActiveSession();

    // 存在，代表尚未下班，阻擋重複打卡
    if (activeSession) {
      throw new ConflictException(
        'User is already checked in. Please check out first.',
      );
    }

    // 建立新紀錄
    const newRecord = new this.attendanceModel({
      userId: this.MOCK_USER_ID,
      checkIn: new Date(),
    });

    return newRecord.save();
  }

  /**
   * 執行下班打卡 (Check-out)
   *
   * 搜尋該使用者最近一筆「尚未下班」的紀錄並進行更新。
   *
   * @throws {BadRequestException} 當找不到進行中的打卡紀錄時拋出 (HTTP 400)
   * @returns {Promise<Attendance>} 回傳更新後的出勤紀錄 (含結束時間與工時)
   */
  async checkOut(): Promise<Attendance> {
    // 搜尋進行中的會話
    const activeSession = await this.getActiveSession();

    // 若無進行中會話，無法執行簽退
    if (!activeSession) {
      throw new BadRequestException(
        'No active session found. Please check in first.',
      );
    }

    // 更新狀態
    activeSession.checkOut = new Date();
    return activeSession.save();
  }

  /**
     * 取得使用者的出勤紀錄 (分頁模式)
     * 
     * 資料預設依照「打卡時間 (checkIn)」進行降冪排序 (最新的在最上面)。
     * 
     * @param page 目前頁碼 (預設 1)
     * @param limit 每頁筆數 (預設 10)
     */
  async findAll(page: number, limit: number): Promise<{
    data: Attendance[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const skip = (page - 1) * limit;

    // 平行執行：取得資料 + 計算總筆數
    const [data, total] = await Promise.all([
      this.attendanceModel
        .find({ userId: this.MOCK_USER_ID })
        .sort({ checkIn: -1 }) // 最新在前
        .skip(skip)
        .limit(limit)
        .exec(),
      this.attendanceModel.countDocuments({ userId: this.MOCK_USER_ID }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
}