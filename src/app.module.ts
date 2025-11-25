import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ||
      'mongodb://127.0.0.1:27017/attendance-db'
    ),
    AttendanceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
