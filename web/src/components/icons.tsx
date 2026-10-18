import {
  IconBuildingHospital,
  IconBulb,
  IconDots,
  IconHeartHandshake,
  IconMessage2,
  IconMoodSad,
  IconRoad,
  IconTrafficLights,
  IconTrash,
  IconTrees,
  IconWheelchair,
  IconBulbFilled,
  IconClock,
  IconUserExclamation,
  IconFileDescription,
  type Icon,
} from "@tabler/icons-react";
import type { IssueCategory, OmbudsmanType } from "@/domain/catalog";

export const CATEGORY_ICONS: Record<IssueCategory, Icon> = {
  lighting: IconBulb,
  pavement: IconRoad,
  sanitation: IconTrash,
  vegetation: IconTrees,
  signage: IconTrafficLights,
  others: IconDots,
};

export const OMBUDSMAN_ICONS: Record<OmbudsmanType, Icon> = {
  compliment: IconHeartHandshake,
  suggestion: IconBulbFilled,
  service_delay: IconClock,
  poor_service: IconMoodSad,
  employee_conduct: IconUserExclamation,
  infrastructure: IconBuildingHospital,
  accessibility: IconWheelchair,
  administrative: IconFileDescription,
  others: IconMessage2,
};
