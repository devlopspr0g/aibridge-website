import { PRICING, DEFAULT_COUNTRY } from "../pricing.js";
export function getPrice(country=DEFAULT_COUNTRY){
  return PRICING[(country||DEFAULT_COUNTRY).toUpperCase()] || PRICING[DEFAULT_COUNTRY];
}
