/**
 * QRCode - Display M-Pesa Dynamic QR code
 * Pass base64 image from mpesa.qrCode() response
 */

export interface QRCodeProps {
  /** Base64 QR code image from Dynamic QR API */
  base64: string;
  alt?: string;
  size?: number;
  className?: string;
}

export function QRCode({
  base64,
  alt = "M-Pesa QR Code",
  size = 300,
  className = "",
}: QRCodeProps) {
  const src = base64.startsWith("data:")
    ? base64
    : `data:image/png;base64,${base64}`;

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`pesafy-qrcode ${className}`}
      loading="lazy"
    />
  );
}
