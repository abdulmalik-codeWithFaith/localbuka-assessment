import { IsDivisibleBy, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/** Request body for POST /points/redeem. Points come in steps of 50. */
export class RedeemPointsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @Min(50)
  @IsDivisibleBy(50)
  points: number;
}