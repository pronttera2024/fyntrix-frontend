import React from 'react'

interface FyntrixLogoProps {
  width?: number
  height?: number
  fontSize?: number
  fontWeight?: number
}

export const FyntrixLogo: React.FC<FyntrixLogoProps> = ({ 
  width = 120, 
  height = 40, 
  fontSize = 18, 
  fontWeight = 900 
}) => {
  return (
    <img
      src="/FyntrixLogo_PNG.png"
      alt="Fyntrix"
      style={{
        width: width,
        height: height,
        objectFit: 'contain'
      }}
    />
  )
}
