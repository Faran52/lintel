export const Widget = ({ items }: { items: string[] }) => {
  return items.map((item, index) => {
    return <span key={index}>{item}</span>;
  });
};
