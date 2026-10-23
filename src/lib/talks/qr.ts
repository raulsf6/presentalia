import QRCode from "qrcode";

/** Renders a value as an inline SVG QR code for the join screen. */
export async function renderQrSvg(value: string): Promise<string> {
  if (!value) {
    throw new Error("A value is required to render a QR code.");
  }
  return QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
  });
}
