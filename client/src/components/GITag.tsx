import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

interface GITagProps {
  giBrand: string;
  className?: string;
}

export default function GITag({ giBrand, className }: GITagProps) {
  return (
    <Badge 
      variant="outline" 
      className={`border-l-4 border-l-primary ${className}`}
      data-testid={`tag-gi-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Award className="w-3 h-3 mr-1" />
      {giBrand}
    </Badge>
  );
}
