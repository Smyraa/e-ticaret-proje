import type { SavedAddress } from "./customer-addresses";

// Kayıtlı adresin listede görünen adı: başlığı ("Ev", "İş"), başlık yoksa "İlçe / İl".
export const addressLabel = (address: SavedAddress) => address.title || `${address.district} / ${address.city}`;
