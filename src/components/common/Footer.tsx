import React from 'react';

interface FooterProps {
  onNavigate?: (view: any) => void;
}

/**
 * Footer besar dihilangkan dari seluruh website sesuai instruksi Section C.
 * Komponen ini tetap diekspor agar tidak menimbulkan breaking import,
 * tetapi mengembalikan null dan tidak merender elemen visual apa pun.
 */
export const Footer: React.FC<FooterProps> = () => {
  return null;
};

export default Footer;
