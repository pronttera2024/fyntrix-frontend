export type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
  image: string;
};

type FeatureDetailsProps = {
  feature: Feature;
  isActive: boolean;
};

export function FeatureDetails({ feature, isActive }: FeatureDetailsProps) {
  const { icon, title, description } = feature;

  return (
    <>
      <div
        className={`bg-secondary text-foreground w-fit rounded-sm p-3 transition-colors ${
          isActive && "bg-foreground text-background"
        }`}
      >
        {icon}
      </div>
      <div className="text-center">
        <p className="mb-2 text-lg text-blue-800 font-medium">{title}</p>
        <p className="text-base text-wrap">{description}</p>
      </div>
    </>
  );
}
