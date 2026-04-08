import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import cheerVideo from './assets/animations/cheer.mp4'
import dressCodeVideo from './assets/animations/dress-code.mp4'
import ringsVideo from './assets/animations/rings.mp4'
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
  const [isPhone, setIsPhone] = useState(() => detectPhone())
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(INVITATION_DATE),
  )
  const [activeSlide, setActiveSlide] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffsetPx, setDragOffsetPx] = useState(0)
  const [name, setName] = useState('')
  const [plusOnes, setPlusOnes] = useState('')
  const [nameError, setNameError] = useState('')
  const [plusOnesError, setPlusOnesError] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attendeesTotal, setAttendeesTotal] = useState(null)

  const heroShellRef = useRef(null)
  const touchStartXRef = useRef(null)
  const touchStartYRef = useRef(null)

  const slides = useMemo(() => heroSlides, [])

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

  const showPreviousSlide = () => {
    if (!slides.length) return

    setActiveSlide((current) =>
      current === 0 ? slides.length - 1 : current - 1,
    )
  }

  const showNextSlide = () => {
    if (!slides.length) return

    setActiveSlide((current) =>
      current === slides.length - 1 ? 0 : current + 1,
    )
  }

  const handleTouchStart = (event) => {
    const touch = event.touches[0]
    touchStartXRef.current = touch.clientX
    touchStartYRef.current = touch.clientY
    setIsDragging(true)
    setDragOffsetPx(0)
  }

  const handleTouchMove = (event) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - touchStartXRef.current
    const deltaY = touch.clientY - touchStartYRef.current

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault()
      setDragOffsetPx(deltaX)
    }
  }

  const handleTouchEnd = (event) => {
    if (touchStartXRef.current === null) return

    const shellWidth = heroShellRef.current?.clientWidth ?? 1
    const swipeDistance = event.changedTouches[0].clientX - touchStartXRef.current
    const swipeThreshold = shellWidth * 0.16

    if (Math.abs(swipeDistance) >= swipeThreshold) {
      if (swipeDistance < 0) showNextSlide()
      if (swipeDistance > 0) showPreviousSlide()
    }

    setIsDragging(false)
    setDragOffsetPx(0)
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  const handleTouchCancel = () => {
    setIsDragging(false)
    setDragOffsetPx(0)
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  const shellWidth = heroShellRef.current?.clientWidth ?? 1
  const dragOffsetPercent = (dragOffsetPx / shellWidth) * 100
  const trackTranslate = -activeSlide * 100 + dragOffsetPercent

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
          ref={heroShellRef}
          className="hero-photo-shell"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {!!slides.length && (
            <div
              className={`hero-track ${isDragging ? 'is-dragging' : ''}`}
              style={{ transform: `translateX(${trackTranslate}%)` }}
            >
              {slides.map((slide, index) => (
                <img
                  key={slide.smallSrc}
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
            <video
              className="section-icon-video section-icon-rings"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            >
              <source src={ringsVideo} type="video/mp4" />
            </video>
            <h2 className="section-title">OUR STORY</h2>
            <p className="section-copy">
              Two hearts met, and a beautiful story began. In each other, we
              found not just love, but a home. With every shared moment, our
              bond grew deeper. And now, we step forward hand in hand, ready to
              write the rest of our story together.
            </p>
          </section>

          <section className="invitation-block" aria-label="Celebration details">
            <video
              className="section-icon-video section-icon-small"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source src={cheerVideo} type="video/mp4" />
            </video>
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

            <a
              className="map-button"
              href="https://maps.app.goo.gl/LihWnPfcCP9a7Xu58"
              target="_blank"
              rel="noreferrer"
            >
              Open in Maps
            </a>
          </section>

          <section className="invitation-block" aria-label="Dress code section">
            <video
              className="section-icon-video section-icon-small"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source src={dressCodeVideo} type="video/mp4" />
            </video>
            <h2 className="section-title">DRESS CODE</h2>
            <p className="section-subtitle">SemiFormal | Baby Blue</p>
          </section>

          <section className="invitation-block" aria-label="RSVP section">
            <video
              className="section-icon-video section-icon-small"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source src={rsvpVideo} type="video/mp4" />
            </video>
            <h2 className="section-title">RSVP</h2>

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

              <button className="rsvp-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Confirm'}
              </button>

              {!!formError && <p className="rsvp-feedback rsvp-feedback-error">{formError}</p>}
              {!!formSuccess && <p className="rsvp-feedback rsvp-feedback-success">{formSuccess}</p>}
            </form>
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
