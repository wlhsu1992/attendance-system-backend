import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
    @Prop({ required: true })
    userId: string; // 模擬使用者 ID

    @Prop({ required: true })
    checkIn: Date;

    @Prop({ default: null })
    checkOut: Date;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);