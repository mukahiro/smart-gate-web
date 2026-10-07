export const formatStudentNumber = (value: string | null) =>
  value?.replace(/^([0-9]{2})([0-9]{4})([0-9]{3})([0-9])$/, "$1-$2-$3-$4") ??
  "学籍番号なし";

export const formatAdminDateTime = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
