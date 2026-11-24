const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€";
/** SMS length and segments: GSM-7 fits 160 characters (153 per part when split), Unicode 70 (67). */
export function smsSegments(text: string) {
  const gsm = [...text].every((c) => GSM.includes(c)); const length = [...text].length; const one = gsm ? 160 : 70, many = gsm ? 153 : 67;
  return { encoding: gsm ? "GSM-7" : "UCS-2", length, segments: length === 0 ? 0 : length <= one ? 1 : Math.ceil(length / many) };
}
