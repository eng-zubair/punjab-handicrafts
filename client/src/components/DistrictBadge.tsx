import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

interface DistrictBadgeProps {
  district: string;
  className?: string;
}

export default function DistrictBadge({ district, className }: DistrictBadgeProps) {
  return (
    <Badge variant="secondary" className={className} data-testid={`badge-district-${district.toLowerCase().replace(/\s+/g, '-')}`}>
      <MapPin className="w-3 h-3 mr-1" />
      {district}
    </Badge>
  );
}
