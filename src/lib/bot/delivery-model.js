export const deliveryModelOptions = [
  { value: 'field', label: 'אני מגיע ללקוח', description: 'בבית, בעסק או באתר העבודה' },
  { value: 'location', label: 'הלקוח מגיע אליי', description: 'לעסק, למרפאה או לסטודיו' },
  { value: 'remote', label: 'מרחוק', description: 'בטלפון, בזום או אונליין' },
  { value: 'mixed', label: 'גם וגם / תלוי בשירות', description: 'נמקד קודם את השירות הראשי' },
];

export function deliveryModelFollowUp(_serviceModel) {
  return 'מעולה. איזה שירות אתה רוצה למלא יותר עכשיו? נבנה קודם קמפיין ודף נחיתה רק בשבילו.';
}
