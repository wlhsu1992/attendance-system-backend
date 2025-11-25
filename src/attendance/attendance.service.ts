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
   * 執行上班打卡 (Check-in)
   *
   * 檢查該使用者是否已有「進行中 (Active)」的會話。
   * 若有未結案的紀錄，則視為重複打卡，拋出異常。
   *
   * @throws {ConflictException} 當使用者目前已在上班狀態時拋出 (HTTP 409)
   * @returns {Promise<Attendance>} 回傳新建立的打卡紀錄
   */
  async checkIn(): Promise<Attendance> {
    // 1. 檢查是否存在 checkOut 為 null 的紀錄
    const activeSession = await this.attendanceModel.findOne({
      userId: this.MOCK_USER_ID,
      checkOut: null,
    });

    // 2. 若存在，代表尚未下班，阻擋重複打卡
    if (activeSession) {
      throw new ConflictException(
        'User is already checked in. Please check out first.',
      );
    }

    // 3. 建立新紀錄
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
   * 計算從 checkIn 到現在的工時 (秒數)。
   *
   * @throws {BadRequestException} 當找不到進行中的打卡紀錄時拋出 (HTTP 400)
   * @returns {Promise<Attendance>} 回傳更新後的出勤紀錄 (含結束時間與工時)
   */
  async checkOut(): Promise<Attendance> {
    // 1. 搜尋進行中的會話
    const activeSession = await this.attendanceModel.findOne({
      userId: this.MOCK_USER_ID,
      checkOut: null,
    });

    // 2. 若無進行中會話，無法執行簽退
    if (!activeSession) {
      throw new BadRequestException(
        'No active session found. Please check in first.',
      );
    }

    // 3. 計算工時
    const checkOutTime = new Date();
    const durationInSeconds = Math.floor(
      (checkOutTime.getTime() - activeSession.checkIn.getTime()) / 1000,
    );

    // 4. 更新狀態
    activeSession.checkOut = checkOutTime;
    activeSession.duration = durationInSeconds;

    return activeSession.save();
  }

  /**
   * 取得使用者的所有出勤紀錄
   *
   * 資料預設依照「打卡時間 (checkIn)」進行降冪排序 (最新的在最上面)。
   *
   * @returns {Promise<Attendance[]>} 出勤紀錄列表
   */
  async findAll(): Promise<Attendance[]> {
    return this.attendanceModel
      .find({ userId: this.MOCK_USER_ID })
      .sort({ checkIn: -1 }) // -1 代表 Descending (降冪)
      .exec();
  }
}