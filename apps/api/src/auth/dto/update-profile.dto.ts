import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  /** Base64-encoded data URL: "data:image/...;base64,..." */
  @IsOptional()
  @IsString()
  picture?: string | null;
}
