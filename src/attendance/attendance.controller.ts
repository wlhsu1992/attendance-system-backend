import { Controller, Post, Patch, Get } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  async checkIn() {
    return this.attendanceService.checkIn();
  }

  @Patch('check-out')
  async checkOut() {
    return this.attendanceService.checkOut();
  }

  @Get()
  async findAll() {
    return this.attendanceService.findAll();
  }
}