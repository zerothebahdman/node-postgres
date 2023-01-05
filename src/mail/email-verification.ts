const EMAIL_VERIFICATION = (fullName: string, token: string) =>
  `${token} ${fullName}`;

export default EMAIL_VERIFICATION;
