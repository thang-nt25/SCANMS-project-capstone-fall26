import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class UploadReviewMediaDto {
  @IsUUID('4')
  productId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reviewToken: string;
}
