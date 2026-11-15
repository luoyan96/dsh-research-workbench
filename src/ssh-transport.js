import ssh2 from 'ssh2';
export const createSshClient = () => new ssh2.Client();
