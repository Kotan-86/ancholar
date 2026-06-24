// 仕様: docs/application/usecase.md#UC-4
export type SocialJetLagAlertDTO = {
  hasWarning: boolean;
  deltaMinutes: number;
  midSleepTime: Date;
  previousMidSleepTime: Date;
};
