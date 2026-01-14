import React from 'react'

interface FyntrixLogoProps {
  fontSize?: number
  fontWeight?: number
}

export const FyntrixLogo: React.FC<FyntrixLogoProps> = ({ fontSize = 18, fontWeight = 900 }) => {
  return (
    <span
      style={{
        backgroundImage: 'linear-gradient(90deg, #0095FF 0%, #10C8A9 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent',
        fontWeight,
        fontSize,
        letterSpacing: 0.5,
      }}
    >
      Fyntrix
    </span>
  )
}
