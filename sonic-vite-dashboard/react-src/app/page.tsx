"use client"

import { useState, useEffect } from 'react'
import BackgroundPaths from '@/components/background-path'
import DashboardOverlay from '@/components/dashboard-overlay'

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false)

  return (
    <div className="relative min-h-screen">
      {!showDashboard ? (
        <BackgroundPaths
          title="Sonic Crypto Dashboard"
          onEnter={() => setShowDashboard(true)}
        />
      ) : (
        <div className="relative min-h-screen">
          <BackgroundPaths title="" />
          <DashboardOverlay />
        </div>
      )}
    </div>
  )
}