import { Controller, Post, Patch, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
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
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.attendanceService.findAll(page, limit);
  }
}