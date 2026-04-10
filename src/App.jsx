import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import LottiePackage from 'lottie-react'
import cheerVideo from './assets/animations/cheer.mp4'
import dressCodeVideo from './assets/animations/dress-code.mp4'
import ringsAnimation from './assets/animations/rings.json'
import champAnimation from './assets/animations/champ.json'
import diamondsAnimation from './assets/animations/diamond.json'
import rsvpAnimation from './assets/animations/rsvp.json'
import rsvpVideo from './assets/animations/rsvp.mp4'
import './App.css'



const INVITATION_DATE = '2026-09-25T17:00:00'
const RSVP_TABLE = import.meta.env.VITE_SUPABASE_RSVP_TABLE || 'attendees'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

const hero430Imports = import.meta.glob('./assets/hero/photosession/*-430.jpg', {
  eager: true,
  import: 'default',
})

const hero860Imports = import.meta.glob('./assets/hero/photosession/*-860.jpg', {
  eager: true,
  import: 'default',
})

const heroSlides = Object.entries(hero430Imports)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, smallSrc]) => {
    const largePath = path.replace('-430.jpg', '-860.jpg')
    const largeSrc = hero860Imports[largePath] ?? smallSrc

    return {
      smallSrc,
      largeSrc,
    }
  })

const LottieComponent =
  typeof LottiePackage === 'function'
    ? LottiePackage
    : typeof LottiePackage?.default === 'function'
      ? LottiePackage.default
      : null

class LottieErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info)
    // Keep the app usable if the animation fails in some browsers/devices.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }

    return this.props.children
  }
}

function getCountdownParts(targetDate) {
  const targetTime = new Date(targetDate).getTime()

  if (Number.isNaN(targetTime)) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
    }
  }

  const distance = targetTime - Date.now()

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
  const isDev = import.meta.env.DEV
  const [isPhone, setIsPhone] = useState(() => detectPhone())
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(INVITATION_DATE),
  )
  const [activeSlide, setActiveSlide] = useState(0)
  const [isTrackTransitionEnabled, setIsTrackTransitionEnabled] = useState(true)
  const [name, setName] = useState('')
  const [plusOnes, setPlusOnes] = useState('')
  const [nameError, setNameError] = useState('')
  const [plusOnesError, setPlusOnesError] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attendeesTotal, setAttendeesTotal] = useState(null)
  const [ringsDebugStatus, setRingsDebugStatus] = useState('idle')

  const ringsLottieRef = useRef(null)
  const ringsPlayTimerRef = useRef(null)

  const slides = useMemo(() => heroSlides, [])
  const carouselSlides = useMemo(() => {
    if (slides.length <= 1) return slides
    return [...slides, slides[0]]
  }, [slides])

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

  useEffect(() => {
    return () => {
      if (ringsPlayTimerRef.current) {
        window.clearTimeout(ringsPlayTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return

    const autoSlideTimer = window.setInterval(() => {
      setActiveSlide((current) => (current >= slides.length ? current : current + 1))
    }, 3500)

    return () => window.clearInterval(autoSlideTimer)
  }, [slides.length])

  useEffect(() => {
    if (isTrackTransitionEnabled || activeSlide !== 0) return

    const rafId = window.requestAnimationFrame(() => {
      setIsTrackTransitionEnabled(true)
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [isTrackTransitionEnabled, activeSlide])

  const handleHeroTrackTransitionEnd = () => {
    if (slides.length <= 1) return
    if (activeSlide !== slides.length) return

    setIsTrackTransitionEnabled(false)
    setActiveSlide(0)
  }

  const trackTranslate = -activeSlide * 100

  const fetchAttendeesTotal = useCallback(async () => {
    if (!supabase) return

    const { data, error, count } = await supabase
      .from(RSVP_TABLE)
      .select('plus_ones', { count: 'exact' })

    if (error) return

    const plusOnesSum = (data ?? []).reduce(
      (sum, row) => sum + (Number(row.plus_ones) || 0),
      0,
    )

    setAttendeesTotal((count ?? 0) + plusOnesSum)
  }, [])

  useEffect(() => {
    fetchAttendeesTotal()
  }, [fetchAttendeesTotal])

  const handleRsvpSubmit = async (event) => {
    event.preventDefault()

    setNameError('')
    setPlusOnesError('')
    setFormError('')
    setFormSuccess('')

    const trimmedName = name.trim()
    const plusOnesValue = Number(plusOnes)

    let hasValidationError = false

    if (!trimmedName) {
      setNameError('Name is empty.')
      hasValidationError = true
    }

    if (plusOnes === '') {
      setPlusOnesError('Plus one value is empty.')
      hasValidationError = true
    } else if (!Number.isInteger(plusOnesValue) || plusOnesValue < 0 || plusOnesValue > 5) {
      setPlusOnesError('Plus one value must be a whole number between 0 and 5.')
      hasValidationError = true
    }

    if (hasValidationError) return

    if (!supabase) {
      setFormError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.')
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.from(RSVP_TABLE).insert({
      name: trimmedName,
      plus_ones: plusOnesValue,
    })

    setIsSubmitting(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setFormSuccess('RSVP submitted successfully ✨')
    setName('')
    setPlusOnes('')
    await fetchAttendeesTotal()
  }

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
        <div
          className="hero-photo-shell"
        >
          {!!slides.length && (
            <div
              className="hero-track"
              style={{
                transform: `translateX(${trackTranslate}%)`,
                transition: isTrackTransitionEnabled ? 'transform 1200ms ease' : 'none',
              }}
              onTransitionEnd={handleHeroTrackTransitionEnd}
            >
              {carouselSlides.map((slide, index) => (
                <img
                  key={`${slide.smallSrc}-${index}`}
                  src={slide.smallSrc}
                  srcSet={`${slide.smallSrc} 430w, ${slide.largeSrc} 860w`}
                  sizes="(max-width: 430px) 100vw, 430px"
                  className="hero-photo hero-slide"
                  alt={`Romantic couple photo ${index + 1}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              ))}
            </div>
          )}
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

          <section className="invitation-block" aria-label="Our story section">
            <LottieErrorBoundary
              fallback={"Animation failed to load."}
              onError={(error, info) => console.log("Lottie error:", error, info)}
            >
              <div
                style={{
                  marginTop: '120px',
                  width: '100%',
                  height: '1700px',
                  overflow: 'hidden',
                  position: 'relative',
                  pointerEvents: 'none',
                  transform: 'translateY(-90%)', /* adjust this value to center the animation vertically */
                }}>
                {LottieComponent ? (
                  <LottieComponent
                    animationData={ringsAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ width: '150%', height: '3400px', marginLeft: '-25%', overflow: 'hidden', pointerEvents: 'none' }}
                  />
                ) : (
                  <div className="section-icon-video section-icon-rings" aria-hidden="true" />
                )}
              </div>

            </LottieErrorBoundary>
            {isDev && <p className="rsvp-feedback">Rings debug: {ringsDebugStatus}</p>}
            <div
              style={{
                marginTop: '-1690px',
              }}
            >

              <h2 className="section-title">OUR STORY</h2>
              <p className="section-copy">
                Two hearts met, and a beautiful story began. In each other, we
                found not just love, but a home. With every shared moment, our
                bond grew deeper. And now, we step forward hand in hand, ready to
                write the rest of our story together.
              </p>
            </div>
          </section>

          <section className="invitation-block" aria-label="Celebration details">
            <LottieErrorBoundary
              fallback={"Animation failed to load."}
              onError={(error, info) => console.log("Lottie error:", error, info)}
            >
              <div
                style={{
                  marginTop: '-100px',
                  width: '100%',
                  height: '1700px',
                  pointerEvents: 'none',
                  transform: 'translateY(-97%)', /* adjust this value to center the animation vertically */
                }}>
                {LottieComponent ? (
                  <LottieComponent
                    animationData={champAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ width: '150%', height: '3400px', marginLeft: '-25%', overflow: 'hidden', pointerEvents: 'none' }}
                  />
                ) : (
                  <div className="section-icon-video section-icon-rings" aria-hidden="true" />
                )}
              </div>

            </LottieErrorBoundary>

            <div
              style={{
                marginTop: '-1450px',
              }}
            >

              <h2 className="section-title">CELEBRATION</h2>
              <p className="section-subtitle">Join us for</p>
              <p className="section-copy section-copy-tight">
                love, laughter, and dancing the night away!
              </p>

              <div className="event-meta">
                <p className="event-meta-item">25 SEP</p>
                <span className="event-meta-divider" aria-hidden="true" />
                <p className="event-meta-item">20:00 P.M.</p>
              </div>

              <p className="venue-address">
                Rixos Alamein Hotel, North Coast,<br />Egypt
              </p>

              <a
                className="map-button"
                href="https://maps.app.goo.gl/LihWnPfcCP9a7Xu58"
                target="_blank"
                rel="noreferrer"
                style={{ position: 'relative', zIndex: 50, pointerEvents: 'auto' }}
              >
                Location
              </a>
            </div>

          </section>

          <section className="invitation-block" aria-label="Dress code section">            

            <div >
              <h2 className="section-title">DRESS CODE</h2>
              <p className="section-subtitle">Semi-Formal | Baby Blue</p>
            </div>
          </section>

          <section className="invitation-block" aria-label="RSVP section">

            <LottieErrorBoundary
              fallback={"Animation failed to load."}
              onError={(error, info) => console.log("Lottie error:", error, info)}
            >
              <div
                style={{
                  marginTop: '-840px',
                  width: '100%',
                  height: '1700px',
                  pointerEvents: 'none',
                  transform: 'translateY(-97%)', /* adjust this value to center the animation vertically */
                }}>
                {LottieComponent ? (
                  <LottieComponent
                    animationData={rsvpAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ width: '150%', height: '3400px', marginLeft: '-25%', overflow: 'hidden', pointerEvents: 'none' }}
                  />
                ) : (
                  <div className="section-icon-video section-icon-rings" aria-hidden="true" />
                )}
              </div>

            </LottieErrorBoundary>

            <div
              style={{ marginTop: "-730px" }}
            >


              <h2 className="section-title">RSVP</h2>

              <p className="section-subtitle">Are you bringing a plus 1?</p>

              <form className="rsvp-form" onSubmit={handleRsvpSubmit} noValidate>
                <input
                  className="rsvp-input"
                  type="text"
                  name="name"
                  placeholder="Name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={!!nameError}
                />
                {!!nameError && <p className="rsvp-feedback rsvp-feedback-error">{nameError}</p>}

                <input
                  className="rsvp-input"
                  type="number"
                  name="plusOnes"
                  placeholder="Are you bringing a plus 1?"
                  min="0"
                  max="5"
                  value={plusOnes}
                  onChange={(event) => setPlusOnes(event.target.value)}
                  aria-invalid={!!plusOnesError}
                />
                {!!plusOnesError && (
                  <p className="rsvp-feedback rsvp-feedback-error">{plusOnesError}</p>
                )}

                <div className="rsvp-toggle-row">
                  <button type="button" className="rsvp-toggle rsvp-toggle-yes" onClick={() => setPlusOnes('1')}>Yes</button>
                  <button type="button" className="rsvp-toggle rsvp-toggle-no" onClick={() => setPlusOnes('0')}>No</button>
                </div>

                <button className="rsvp-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Confirm'}
                </button>

                {!!formError && <p className="rsvp-feedback rsvp-feedback-error">{formError}</p>}
                {!!formSuccess && <p className="rsvp-feedback rsvp-feedback-success">{formSuccess}</p>}
              </form>

            </div>

          </section>

          <section className="invitation-block invitation-block-last" aria-label="Attendees summary">
            <p className="attendees-count">{attendeesTotal ?? '...'}</p>
            <p className="attendees-label">Attendees</p>
          </section>
        </div>
      </section>
      
    </main>
  )
}

export default App
