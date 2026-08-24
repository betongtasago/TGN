import dns from 'node:dns';
import net from 'node:net';
import nodemailer from 'nodemailer';

export interface Ipv4SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * Resolve the SMTP hostname to IPv4 before opening the connection.
 * This avoids hosts that advertise unreachable IPv6 routes while retaining
 * the original hostname for TLS certificate verification.
 */
export async function createIpv4SmtpTransporter(options: Ipv4SmtpOptions) {
  const host = options.host.trim();
  const connectHost = net.isIPv4(host) ? host : (await dns.promises.resolve4(host))[0];
  if (!connectHost) throw new Error(`Không tìm thấy địa chỉ IPv4 cho máy chủ SMTP ${host}.`);

  const transporter = nodemailer.createTransport({
    host: connectHost,
    port: options.port,
    secure: options.secure,
    requireTLS: !options.secure,
    auth: {
      user: options.user,
      pass: options.pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
      ...(net.isIPv4(host) ? {} : { servername: host }),
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
  });

  return { transporter, connectHost };
}
