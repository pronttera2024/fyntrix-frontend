import React from 'react'
import fyntrixLogo from '../../assets/FyntrixLogo.png'
import shortLogo from '../../assets/FyntrixLogo.png'

interface FyntrixLogoProps {
  width?: number
  height?: number
  isMobile?: boolean
}

export const FyntrixLogo: React.FC<FyntrixLogoProps> = ({ 
  width = shortLogo ? '30' : '120', 
  height = 30, 
  isMobile = false
}) => {
  return (
    <img
      src={isMobile ? shortLogo : fyntrixLogo}
      alt="Fyntrix"
      style={{
        width: width,
        height: height,
        objectFit: 'contain'
      }}
    />
  )
}
