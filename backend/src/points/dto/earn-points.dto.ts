import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export const EARN_ACTIONS = ['check-in', 'review', 'referral'] as const;
export type EarnAction = (typeof EARN_ACTIONS)[number];

/** Request body for POST /points/earn. */
export class EarnPointsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsIn(EARN_ACTIONS)
  action: EarnAction;

  /** Required for 'check-in' and 'review'. */
  @ValidateIf((dto: EarnPointsDto) => dto.action === 'check-in' || dto.action === 'review')
  @IsString()
  @IsNotEmpty()
  restaurantId?: string;

  /** Required for 'referral'. */
  @ValidateIf((dto: EarnPointsDto) => dto.action === 'referral')
  @IsString()
  @IsNotEmpty()
  referredUserId?: string;
}