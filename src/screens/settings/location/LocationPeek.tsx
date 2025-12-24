// src/screens/catalog/LocationPeek.tsx

import React, { useEffect, useState } from "react";

import type { Location, LocationType } from "../../../types/location";
import { fetchLocation } from "../../../api/location";

import { LinkIcon, HomeModernIcon, PhoneIcon } from "@heroicons/react/24/outline";

interface Props {
  locationId: number;
}

export const LocationPeek: React.FC<Props> = ({ locationId }) => {
  const [location, setLocation] = useState<Location>();

  useEffect(() => {
    (async () => {
      const data = await fetchLocation(locationId);
      setLocation(data);
    })();
  }, [locationId])

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-8">
        <h2 className="text-3xl font-semibold">{location?.name}</h2>
        
        <span className="px-1.5 py-0.5 bg-purple-400 rounded-md text-nowrap w-fit">{location?.type_id}</span>
        
        <div className="flex items-center gap-3">
          <LinkIcon className="w-4 h-4" />
          <a href={location?.website_url}>{location?.website_url}</a>
        </div>
        
        <div className="flex items-start gap-3">
          <HomeModernIcon className="w-5 h-5" />
          <div className="flex flex-col items-start">
            <span>{location?.address_lines?.address_line_1}</span>
            <span>{location?.address_lines?.address_line_2}</span>
            <span>{location?.address_lines?.city}</span>
            <span>{location?.address_lines?.state_name}, {location?.address_lines?.country_name}</span>
            <span>{location?.address_lines?.postal_code}</span>
          </div>
        </div>

        { location?.address_lines?.phone_1 && (
          <div className="flex items-center gap-3">
            <PhoneIcon className="w-4 h-4" />
            <p>
              { location.address_lines.phone_1_code && (
                <span>{location?.address_lines?.phone_1_code_code}</span>
              )}
              {location?.address_lines?.phone_1}
            </p>
          </div>
        )}
        
        { location?.address_lines?.phone_2 && (
          <div className="flex items-center gap-3">
            <PhoneIcon className="w-4 h-4" />
            <p>
              { location.address_lines.phone_2_code && (
                <span>{location?.address_lines?.phone_2_code_code}</span>
              )}
              {location?.address_lines?.phone_2}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};