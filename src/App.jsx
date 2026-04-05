import { useEffect, useState } from 'react'
import heroImg from '../design_Sources/Photosession/beautiful-couple-on-the-beach-2026-03-25-02-45-15-utc.jpg'
import './App.css'

const INVITATION_DATE = '2026-9-25T17:00:00'

function getCountdownParts(targetDate) {
  const distance = new Date(targetDate).getTime() - Date.now()

  if (distance <= 0) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
    }
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((distance / (1000 * 60)) % 60)
  const seconds = Math.floor((distance / 1000) % 60)

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  }
}

function detectPhone() {
  const isNarrowViewport = window.matchMedia('(max-width: 540px)').matches
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  const hasMobileUserAgent =
    /Mobi|Android|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini/i.test(
      navigator.userAgent,
    )

  return isNarrowViewport && (isCoarsePointer || hasMobileUserAgent)
}

function App() {
  const [isPhone, setIsPhone] = useState(() => detectPhone())
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(INVITATION_DATE),
  )

  useEffect(() => {
    const updateDeviceFlag = () => setIsPhone(detectPhone())

    window.addEventListener('resize', updateDeviceFlag)

    return () => {
      window.removeEventListener('resize', updateDeviceFlag)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdownParts(INVITATION_DATE))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!isPhone) {
    return (
      <main className="unsupported-page">
        <div className="unsupported-card">
          <p className="emoji" aria-hidden="true">
            💌📱
          </p>
          <h1>Please open this invitation on your phone</h1>
          <p>
            This page was designed as a sweet, phone-first experience. Grab your
            phone and we&apos;ll be waiting for you there ✨
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="invitation-page">
      <section className="hero-section" aria-label="Invitation hero section">
        <div className="hero-photo-shell">
          <img
            src={heroImg}
            className="hero-photo"
            alt="Romantic couple on the beach"
          />
          <div className="hero-veil" aria-hidden="true" />
        </div>

        <div className="hero-copy">
          <div className="names-layer" aria-label="Names of the couple">
            <span className="ampersand" aria-hidden="true">
              &amp;
            </span>
            <h1 className="invitation-name invitation-name-john">John</h1>
            <h1 className="invitation-name invitation-name-sally">Sally</h1>
          </div>

          <p className="invitation-title">YOU&apos;RE INVITED!</p>
          <p className="invitation-message">
            We&apos;re starting our forever with full hearts. Join us as we
            celebrate love, laughter, and a lifetime of smiles.
          </p>

          <section className="countdown-section" aria-label="Event countdown">
            <div className="countdown-grid">
              <article className="countdown-item">
                <p className="countdown-value">{countdown.days}</p>
                <p className="countdown-label">DAYS</p>
              </article>
              <article className="countdown-item">
                <p className="countdown-value">{countdown.hours}</p>
                <p className="countdown-label">HOURS</p>
              </article>
              <article className="countdown-item">
                <p className="countdown-value">{countdown.minutes}</p>
                <p className="countdown-label">MINUTES</p>
              </article>
              <article className="countdown-item">
                <p className="countdown-value">{countdown.seconds}</p>
                <p className="countdown-label">SECONDS</p>
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
