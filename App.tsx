import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BookingForm from './components/BookingForm';
import CheckBooking from './components/CheckBooking';
import InfoSection from './components/InfoSection';
import Intro from './components/Intro';
import AdminPanel from './components/AdminPanel';
import BusLoader from './components/BusLoader';
import Swal from 'sweetalert2';
import { BookingFormData, BookingResponse, ApiResponse } from './types';
import { GOOGLE_SCRIPT_URL, ADMIN_WHATSAPP_NUMBER, BUS_SERVICES, BANK_DETAILS } from './constants';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [activeTab, setActiveTab] = useState<'new' | 'check'>('new');
  const [isLoading, setIsLoading] = useState(false);
  
  // Secret Admin Access State
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page === 'booking') {
      const el = document.getElementById('booking-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSecretAdminAccess = () => {
    const now = Date.now();
    // Check if clicks are rapid (within 500ms of each other)
    if (now - lastClickTime < 500) {
      const newCount = adminClickCount + 1;
      setAdminClickCount(newCount);
      if (newCount >= 5) {
        setCurrentPage('admin');
        setAdminClickCount(0);
        Swal.fire({
            icon: 'info',
            title: 'Admin Mode Detected',
            text: 'Please authenticate to continue.',
            timer: 1500,
            showConfirmButton: false,
            customClass: { popup: 'rounded-3xl' }
        });
      }
    } else {
      setAdminClickCount(1);
    }
    setLastClickTime(now);
  };

  // Helper to format time as "09.00 PM"
  const formatTimeForSheet = (timeStr: string) => {
    if (!timeStr) return "";
    
    // Check if it's already in 24h format "HH:MM"
    if (timeStr.includes(':') && !timeStr.toLowerCase().includes('m')) {
        const [h, m] = timeStr.split(':');
        let hour = parseInt(h);
        const period = hour >= 12 ? 'PM' : 'AM';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        const hourStr = hour.toString().padStart(2, '0');
        return `${hourStr}.${m} ${period}`;
    }

    // Handle "9:00 PM" -> "09.00 PM"
    return timeStr
        .replace(/:/g, '.')              // Replace colon with dot
        .replace(/\b(\d)\./, '0$1.')     // Add leading zero if single digit hour
        .replace(/([AP]M)/i, ' $1')      // Ensure space before AM/PM
        .replace(/\s+/, ' ')             // Normalize spaces
        .trim();
  };

  const submitBooking = async (data: BookingFormData) => {
    const pricePerSeat = BUS_SERVICES[data.bus].price;
    const totalCost = pricePerSeat * (data.maleSeats + data.femaleSeats);
    
    // Date formatting (MM/DD/YYYY)
    const [year, month, day] = data.date.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    
    // Time formatting
    const formattedTime = formatTimeForSheet(data.time);

    const waMessage = `*NEW LAGAN BUS BOOKING*%0A%0A` +
      `👤 *Name:* ${data.name}%0A` +
      `📱 *Phone:* ${data.phone}%0A` +
      `📍 *Route:* ${data.from} → ${data.to}%0A` +
      `📅 *Date:* ${data.date}%0A` +
      `⏰ *Time:* ${formattedTime}%0A` +
      `🚌 *Bus:* ${data.bus}%0A` +
      `💺 *Seats:* M:${data.maleSeats} / F:${data.femaleSeats}%0A` +
      `💰 *Total:* LKR ${totalCost.toLocaleString()}%0A%0A` +
      `_Please attach payment slip for ${BANK_DETAILS.bankName} account_`;

    const result = await Swal.fire({
      title: 'Confirm Booking',
      text: 'You will be redirected to WhatsApp to finalize the booking.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Open WhatsApp',
      confirmButtonColor: '#0066FF',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl',
        cancelButton: 'rounded-xl'
      }
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('method', 'add');
        
        // --- STRICT PARAMETER MAPPING (Lowercase for Script) ---
        // Sending lowercase keys because the updated Google Script expects params.name, params.total etc.
        params.append('name', data.name);
        params.append('phone', data.phone); 
        params.append('bus', data.bus);
        params.append('time', formattedTime);
        params.append('date', formattedDate);
        params.append('maleSeats', data.maleSeats.toString());
        params.append('femaleSeats', data.femaleSeats.toString());
        params.append('pickup', data.from);
        params.append('payment', 'Pending');
        params.append('total', totalCost.toString());
        params.append('destination', data.to);

        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: params,
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${waMessage}`, '_blank');

        Swal.fire({
            title: 'Submitted!',
            text: 'Please complete the payment on WhatsApp.',
            icon: 'success',
            timer: 3000,
            confirmButtonColor: '#0066FF',
            customClass: { popup: 'rounded-3xl' }
        });

        setActiveTab('check'); 
      } catch (error) {
        console.error("Booking Error:", error);
        Swal.fire({
          title: 'Connection Issue', 
          text: 'We could not auto-save your booking, but you can still complete it via WhatsApp.',
          icon: 'warning',
          confirmButtonText: 'Continue to WhatsApp',
          confirmButtonColor: '#0066FF'
        }).then(() => {
           window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${waMessage}`, '_blank');
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const checkBookingStatus = async (phone: string): Promise<BookingResponse | null> => {
    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-9); 
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?phone=${cleanPhone}&method=search`);
      
      if (!response.ok) throw new Error('Network response was not ok');

      const data: ApiResponse = await response.json();

      // Relaxed check: accept if booking or allBookings exists, even if success flag is missing
      if (data.booking || (data.allBookings && data.allBookings.length > 0)) {
        return data.booking || (data.allBookings ? data.allBookings[0] : null);
      } else {
        Swal.fire({
            title: 'No Ticket Found', 
            html: `We couldn't find a booking for <b>...${cleanPhone}</b>.<br/>Please check the number or contact support.`, 
            icon: 'info',
            confirmButtonColor: '#0066FF',
            customClass: { popup: 'rounded-3xl' }
        });
        return null;
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: 'System Error',
        text: 'Could not connect to the booking server. Please try again later.',
        icon: 'error',
        confirmButtonColor: '#0066FF',
        customClass: { popup: 'rounded-3xl' }
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Render Admin Panel separately
  if (currentPage === 'admin') {
    return <AdminPanel onExit={() => handleNavigate('home')} />;
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Loading Overlay */}
      {isLoading && <BusLoader variant="overlay" text="Processing..." />}

      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 dark:bg-primary/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-pink-400/20 dark:bg-pink-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {showIntro && <Intro onFinish={() => setShowIntro(false)} />}
      
      <div className={`relative z-10 transition-opacity duration-1000 ${showIntro ? 'opacity-0' : 'opacity-100'}`}>
        <Navbar onNavigate={handleNavigate} currentPage={currentPage} />

        <main className="flex-grow">
          {currentPage === 'home' && (
            <>
              <Hero onBookNow={() => handleNavigate('booking')} />
              
              <section id="booking-section" className="relative z-30 px-4 -mt-20 md:-mt-32 pb-20">
                <div className="max-w-5xl mx-auto">
                  <div className="flex justify-center mb-8 animate-fade-in-up [animation-delay:800ms] opacity-0" style={{ animationFillMode: 'forwards' }}>
                      <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-full border border-white/20 inline-flex shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
                          <button
                          onClick={() => setActiveTab('new')}
                          className={`px-6 md:px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                              activeTab === 'new' 
                              ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' 
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                          >
                          Book Ticket
                          </button>
                          <button
                          onClick={() => setActiveTab('check')}
                          className={`px-6 md:px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                              activeTab === 'check' 
                              ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' 
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                          >
                          Check Status
                          </button>
                      </div>
                  </div>

                  <div className="transition-all duration-500 ease-in-out">
                    {activeTab === 'new' ? (
                      <BookingForm onSubmit={submitBooking} />
                    ) : (
                      <CheckBooking onCheck={checkBookingStatus} isLoading={isLoading} />
                    )}
                  </div>
                </div>
              </section>
              
              <InfoSection id="routes" />
              <InfoSection id="fleet" />
              <InfoSection id="safety" />
            </>
          )}
          
          {currentPage === 'routes' && <InfoSection id="routes" />}
          {currentPage === 'fleet' && <InfoSection id="fleet" />}
          {currentPage === 'safety' && <InfoSection id="safety" />}
        </main>

        <footer className="bg-slate-950/80 backdrop-blur-xl text-white py-12 md:py-20 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="md:col-span-2">
              <h3 className="text-3xl font-black mb-6 tracking-tight">LAGAN<span className="text-primary">BUS</span></h3>
              <p className="text-slate-400 text-lg leading-relaxed max-w-sm mx-auto md:mx-0">
                  Redefining intercity travel in Sri Lanka. 
                  Luxury coaches, professional crews, and a commitment to punctuality.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-widest mb-6">Contact</h4>
              <p className="text-slate-400 mb-2">Nintavur Main Road</p>
              <p className="text-slate-400 mb-4">Eastern Province, Sri Lanka</p>
              <p className="text-2xl font-bold text-white">+94 70 136 2527</p>
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-widest mb-6">Legal</h4>
              <ul className="space-y-3 text-slate-400">
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Refund Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm gap-4">
              <p 
                onClick={handleSecretAdminAccess}
                className="select-none cursor-default transition-colors hover:text-slate-400 active:text-primary"
              >
                © 2026 Lagan Bus Services. All rights reserved.
              </p>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <a 
                  href="https://wedoxa2025-info.github.io/wedoxa-gen-z-it-solutions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  Experience by <span className="font-semibold text-slate-400 hover:text-white transition-colors">Wedoxa Intelligence</span>
                </a>
              </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;