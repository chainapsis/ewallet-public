export interface DiscordTokenInfo {
  id: string;
  username: string;
  discriminator: string;
  email: string;
  verified?: boolean;
  avatar?: string;
  global_name?: string;
}
