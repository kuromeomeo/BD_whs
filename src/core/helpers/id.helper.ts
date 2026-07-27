export class IdHelper {
  static generateNextId(prefix: string, list: { id: string }[]): string {
    if (!list || list.length === 0) {
      return `${prefix}01`;
    }

    let maxNum = 0;

    for (const item of list) {
      if (!item.id?.startsWith(prefix)) continue;

      const value = parseInt(item.id.substring(prefix.length), 10);

      if (!isNaN(value) && value > maxNum) {
        maxNum = value;
      }
    }

    return `${prefix}${String(maxNum + 1).padStart(2, '0')}`;
  }
}