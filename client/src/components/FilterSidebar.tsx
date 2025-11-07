import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const districts = [
  "Lahore",
  "Multan",
  "Bahawalpur",
  "Faisalabad",
  "Gujranwala",
  "Rawalpindi",
  "Sahiwal",
  "Sargodha",
  "D.G. Khan"
];

const giBrands = [
  "Lahore Heritage Crafts",
  "Multani Crafts",
  "Cholistani Heritage",
  "Faisalabadi Weaves",
  "Punjab Metal & Leather Works",
  "Pothohari Crafts",
  "Sufi Craft Collection",
  "Salt & Stone Crafts",
  "Saraiki Tribal Arts"
];

export default function FilterSidebar() {
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedGI, setSelectedGI] = useState<string[]>([]);

  const handleDistrictChange = (district: string, checked: boolean) => {
    if (checked) {
      setSelectedDistricts([...selectedDistricts, district]);
    } else {
      setSelectedDistricts(selectedDistricts.filter(d => d !== district));
    }
    console.log('Districts selected:', checked ? [...selectedDistricts, district] : selectedDistricts.filter(d => d !== district));
  };

  const handleGIChange = (gi: string, checked: boolean) => {
    if (checked) {
      setSelectedGI([...selectedGI, gi]);
    } else {
      setSelectedGI(selectedGI.filter(g => g !== gi));
    }
    console.log('GI brands selected:', checked ? [...selectedGI, gi] : selectedGI.filter(g => g !== gi));
  };

  const handleClearFilters = () => {
    setSelectedDistricts([]);
    setSelectedGI([]);
    setPriceRange([0, 50000]);
    console.log('Filters cleared');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Price Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={50000}
            step={500}
            className="w-full"
            data-testid="slider-price-range"
          />
          <div className="flex items-center justify-between text-sm">
            <span data-testid="text-price-min">Rs. {priceRange[0].toLocaleString()}</span>
            <span data-testid="text-price-max">Rs. {priceRange[1].toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">District</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {districts.map((district) => (
            <div key={district} className="flex items-center space-x-2">
              <Checkbox
                id={`district-${district}`}
                checked={selectedDistricts.includes(district)}
                onCheckedChange={(checked) => handleDistrictChange(district, checked as boolean)}
                data-testid={`checkbox-district-${district.toLowerCase().replace(/\s+/g, '-')}`}
              />
              <Label
                htmlFor={`district-${district}`}
                className="text-sm font-normal cursor-pointer"
              >
                {district}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">GI Brand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {giBrands.map((gi) => (
            <div key={gi} className="flex items-center space-x-2">
              <Checkbox
                id={`gi-${gi}`}
                checked={selectedGI.includes(gi)}
                onCheckedChange={(checked) => handleGIChange(gi, checked as boolean)}
                data-testid={`checkbox-gi-${gi.toLowerCase().replace(/\s+/g, '-')}`}
              />
              <Label
                htmlFor={`gi-${gi}`}
                className="text-sm font-normal cursor-pointer"
              >
                {gi}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button 
        variant="outline" 
        className="w-full"
        onClick={handleClearFilters}
        data-testid="button-clear-filters"
      >
        Clear All Filters
      </Button>
    </div>
  );
}
