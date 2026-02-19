import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Search, 
  LogOut, 
  Download, 
  Calendar, 
  RefreshCw,
  Lock,
  Filter,
  Trash2,
  Edit,
  X,
  Save,
  Archive,
  History,
  MapPin,
  Clock,
  Bus,
  CheckCircle,
  AlertCircle,
  Bell,
  Calculator,
  Armchair,
  Fingerprint,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import Swal from 'sweetalert2';
import { BookingResponse } from '../types';
import { GOOGLE_SCRIPT_URL, ADMIN_PASSWORD, CITIES, BUS_SERVICES } from '../constants';
import { generateTicketPDF } from '../services/pdfGenerator';
import BusLoader from './BusLoader';

interface AdminPanelProps {
  onExit: () => void;
}

// Extend BookingResponse locally to track origin sheet
interface AdminBooking extends BookingResponse {
  origin: 'active' | 'archive';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  
  // Categorized Bookings
  const [pendingBookings, setPendingBookings] = useState<AdminBooking[]>([]);
  const [activeBookings, setActiveBookings] = useState<AdminBooking[]>([]);
  const [archivedBookings, setArchivedBookings] = useState<AdminBooking[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // View Mode: Pending, Active, Archive
  const [viewMode, setViewMode] = useState<'pending' | 'active' | 'archive'>('active');

  // Edit State
  const [editingBooking, setEditingBooking] = useState<AdminBooking | null>(null);
  // We store the original state when opening the modal to reference "Requested Count" while typing
  const [originalBooking, setOriginalBooking] = useState<AdminBooking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: Format Date nicely
  const formatDisplayDate = (dateVal: any) => {
    if (!dateVal) return '-';
    // Check if it's already a simple string
    if (typeof dateVal === 'string' && dateVal.length < 15 && !dateVal.includes('T')) return dateVal;
    
    try {
        const date = new Date(dateVal);
        if (isNaN(date.getTime())) return dateVal; // Fallback
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    } catch (e) {
        return dateVal;
    }
  };

  // Helper: Format Time Strict (9:00 PM -> 09.00 PM)
  const formatTimeStrict = (timeStr: any) => {
    if (!timeStr) return "";
    let s = String(timeStr);
    
    // Check if it's already in 24h format "HH:MM" without AM/PM
    if (s.includes(':') && !s.toLowerCase().includes('m')) {
        const [h, m] = s.split(':');
        let hour = parseInt(h);
        const period = hour >= 12 ? 'PM' : 'AM';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        const hourStr = hour.toString().padStart(2, '0');
        return `${hourStr}.${m} ${period}`;
    }

    // Handle "9:00 PM" -> "09.00 PM"
    return s
        .replace(/:/g, '.')              // Replace colon with dot
        .replace(/\b(\d)\./, '0$1.')     // Add leading zero if single digit hour
        .replace(/([AP]M)/i, ' $1')      // Ensure space before AM/PM
        .replace(/\s+/, ' ')             // Normalize spaces
        .trim();
  };

  // Check Biometric Availability on Mount
  useEffect(() => {
    // Basic availability check (hardware)
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => {
          setBiometricAvailable(available);
          if (!available) setShowPasswordInput(true);
        })
        .catch(err => {
          console.warn("Biometric availability check failed:", err);
          setShowPasswordInput(true);
        });
    } else {
      setShowPasswordInput(true);
    }
  }, []);

  // Biometric Auth Handler
  const handleBiometricAuth = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: "Lagan Bus Admin",
            id: window.location.hostname 
          },
          user: {
            id: Uint8Array.from("admin", c => c.charCodeAt(0)),
            name: "admin@lagan.com",
            displayName: "Admin User"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "none"
        }
      });

      if (credential) {
        setIsAuthenticated(true);
        Swal.fire({
          icon: 'success',
          title: 'Identity Verified',
          text: 'Access Granted',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'rounded-3xl' }
        });
      }
    } catch (error: any) {
      console.error("Biometric failed", error);
      
      // Handle Permission/Feature Policy errors specifically
      if (error.name === 'NotAllowedError' || error.message.includes('not enabled')) {
         Swal.fire({
            icon: 'warning',
            title: 'Biometrics Unavailable',
            text: 'Biometric access is restricted in this browser context. Please use the Access Key.',
            confirmButtonColor: '#0066FF',
            customClass: { popup: 'rounded-3xl' }
         });
         setBiometricAvailable(false); // Disable future attempts in this session
      } else {
         Swal.fire({
            icon: 'error',
            title: 'Verification Failed',
            text: 'Could not verify identity. Please use password.',
            confirmButtonColor: '#0066FF',
            customClass: { popup: 'rounded-3xl' }
         });
      }
      
      // Fallback to password input on failure
      setShowPasswordInput(true);
    }
  };

  // Login Handler (Password)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      // Data fetch triggered by useEffect
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'Incorrect password provided.',
        confirmButtonColor: '#0066FF',
        customClass: { popup: 'rounded-3xl' }
      });
    }
  };

  // Fetch Data - fetches BOTH Active and Archive
  const fetchBookings = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    
    try {
      const [activeRes, archiveRes] = await Promise.all([
        fetch(`${GOOGLE_SCRIPT_URL}?method=getAll&type=active`),
        fetch(`${GOOGLE_SCRIPT_URL}?method=getAll&type=archive`)
      ]);
      
      const activeData = await activeRes.json();
      const archiveData = await archiveRes.json();
      
      const activeRaw = activeData.bookings || (activeData.success ? (activeData.bookings || activeData.allBookings) : []) || [];
      const archiveRaw = archiveData.bookings || (archiveData.success ? (archiveData.bookings || archiveData.allBookings) : []) || [];

      // Process Active Sheet Data
      const pendingList: AdminBooking[] = [];
      const activeList: AdminBooking[] = [];

      activeRaw.forEach((b: any, index: number) => {
        // FALLBACK ROW INDEX: If API doesn't provide it, assume sequential order starting at row 2
        const computedRowIndex = b.rowIndex || (index + 2);

        // Normalize status with trim() to avoid "Pending " issues
        const status = String(b.Status || b.status || 'Confirmed').trim().toLowerCase();
        const booking = { 
            ...b, 
            origin: 'active' as const,
            rowIndex: computedRowIndex 
        };
        
        if (status === 'new' || status === 'pending') {
          pendingList.push(booking);
        } else {
          activeList.push(booking);
        }
      });

      // Process Archive Sheet Data
      const archiveList = archiveRaw.map((b: any, index: number) => ({ 
          ...b, 
          origin: 'archive' as const,
          rowIndex: b.rowIndex || (index + 2)
      }));

      // Sort functions (Newest first)
      const dateSorter = (a: any, b: any) => {
          // Try Booking ID first for absolute chronological order of creation
          const idA = a["Booking ID"] || a["Booking Id"];
          const idB = b["Booking ID"] || b["Booking Id"];
          if (idA && idB) return idB.localeCompare(idA);
          
          return (b.rowIndex || 0) - (a.rowIndex || 0);
      };

      setPendingBookings(pendingList.sort(dateSorter));
      setActiveBookings(activeList.sort(dateSorter));
      setArchivedBookings(archiveList.sort(dateSorter));

    } catch (error) {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Sync Error',
        text: 'Could not fetch booking data. Ensure Google Script is updated.',
        confirmButtonColor: '#0066FF',
        customClass: { popup: 'rounded-3xl' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch on login
  useEffect(() => {
    fetchBookings();
  }, [isAuthenticated]);

  // Determine which list to show
  const currentList = viewMode === 'pending' ? pendingBookings 
                    : viewMode === 'active' ? activeBookings 
                    : archivedBookings;

  // Filter Logic (Search & Date Picker)
  const filteredBookings = currentList.filter(b => {
    const searchString = (searchTerm || '').toLowerCase();
    const matchesSearch = 
      String(b.Name || b.name || '').toLowerCase().includes(searchString) ||
      String(b.Phone || b.phone || '').includes(searchString) ||
      String(b["Booking ID"] || b["Booking Id"] || '').toLowerCase().includes(searchString);
    
    // Normalize date for comparison
    const rawDate = b.Date || b.dateFormatted || '';
    let matchesDate = true;
    if (filterDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
             const isoDate = d.toISOString().split('T')[0];
             matchesDate = isoDate === filterDate;
        } else {
             matchesDate = rawDate.includes(filterDate);
        }
    }

    return matchesSearch && matchesDate;
  });

  // Calculate totals
  const totalRevenue = [...activeBookings, ...archivedBookings].reduce((acc, curr) => {
    const total = curr.Total || curr.totalAmount || curr.estimatedTotal || 0;
    return acc + (typeof total === 'string' ? parseFloat(total.replace(/,/g, '')) : total);
  }, 0);

  // Count seats strictly based on comma separation (e.g. "12,13" = 2 pax)
  const countSeatEntries = (val: any) => {
      if (!val) return 0;
      const s = String(val).trim();
      if (!s) return 0;
      return s.split(',').filter(item => item.trim() !== '').length;
  };

  const totalPassengers = [...activeBookings, ...archivedBookings].reduce((acc, curr) => {
    const m = countSeatEntries(curr["Male Seat"] || curr.maleSeats);
    const f = countSeatEntries(curr["Female Seat"] || curr.femaleSeats);
    return acc + m + f;
  }, 0);

  const openEditModal = (booking: AdminBooking) => {
    setEditingBooking(booking);
    // Create a shallow copy for the original state to track initial request counts
    setOriginalBooking({ ...booking });
  };

  const closeEditModal = () => {
    setEditingBooking(null);
    setOriginalBooking(null);
  };

  // Approve Handler
  const handleApprove = async (booking: AdminBooking) => {
      const id = booking["Booking ID"] || booking["Booking Id"];
      const row = booking.rowIndex;

      if (!id && !row) return;

      setIsLoading(true);
      try {
          const params = new URLSearchParams();
          params.append('method', 'update');
          params.append('id', id || '');
          if (row) params.append('row', row.toString());
          params.append('type', 'active');
          params.append('status', 'Confirmed'); 
          params.append('Status', 'Confirmed');

          await fetch(GOOGLE_SCRIPT_URL, { 
              method: 'POST',
              body: params,
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });

          // Optimistic UI Update
          setPendingBookings(prev => prev.filter(b => (b["Booking ID"] || b["Booking Id"]) !== id));
          setActiveBookings(prev => [{...booking, Status: 'Confirmed', status: 'Confirmed'}, ...prev]);

          Swal.fire({
              title: 'Approved!',
              text: 'Booking moved to Active list.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false,
              customClass: { popup: 'rounded-3xl' }
          });

      } catch (error) {
          Swal.fire('Error', 'Failed to approve booking', 'error');
      } finally {
          setIsLoading(false);
      }
  };

  // Delete Handler
  const handleDelete = async (booking: AdminBooking) => {
    const id = booking["Booking ID"] || booking["Booking Id"];
    const row = booking.rowIndex;

    if (!id && !row) return;

    const result = await Swal.fire({
        title: 'Delete Booking?',
        text: "This cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Delete',
        customClass: { popup: 'rounded-3xl' }
    });

    if (result.isConfirmed) {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('method', 'delete');
            params.append('id', id || '');
            if (row) params.append('row', row.toString());
            params.append('type', booking.origin); 

            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: params,
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // Optimistic update
            if (viewMode === 'pending') setPendingBookings(prev => prev.filter(b => (b["Booking ID"] || b["Booking Id"]) !== id));
            if (viewMode === 'active') setActiveBookings(prev => prev.filter(b => (b["Booking ID"] || b["Booking Id"]) !== id));
            if (viewMode === 'archive') setArchivedBookings(prev => prev.filter(b => (b["Booking ID"] || b["Booking Id"]) !== id));
            
            Swal.fire({
                title: 'Deleted!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-3xl' }
            });
        } catch (error) {
            Swal.fire('Error', 'Failed to delete booking', 'error');
        } finally {
            setIsLoading(false);
        }
    }
  };

  // Update Handler
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    setIsSubmitting(true);
    try {
        const id = editingBooking["Booking ID"] || editingBooking["Booking Id"];
        const row = editingBooking.rowIndex;

        const params = new URLSearchParams();
        params.append('method', 'update');
        params.append('id', id || '');
        // IMPORTANT: Send row index if available, as sheet might not have ID column
        if (row) params.append('row', row.toString()); 
        params.append('type', editingBooking.origin);
        
        const strictTime = formatTimeStrict(editingBooking.Time || editingBooking.time);
        
        // Clean Date: If it looks like ISO (2025-02-...), format to MM/DD/YYYY
        let cleanDate = editingBooking.Date || editingBooking.dateFormatted || '';
        try {
             if (cleanDate.includes('T') || cleanDate.includes('-')) {
                 const d = new Date(cleanDate);
                 if (!isNaN(d.getTime())) {
                     // Force MM/DD/YYYY format
                     cleanDate = d.toLocaleDateString('en-US', {
                         month: '2-digit',
                         day: '2-digit',
                         year: 'numeric'
                     });
                 }
             }
        } catch(e) { /* ignore */ }

        // Ensure total is just a number string without commas
        const cleanTotal = String(editingBooking.Total || editingBooking.totalAmount || 0).replace(/,/g, '');

        // Map both lowerCamelCase and Exact Header Title Case to ensure script matches
        const payload: Record<string, string> = {
            'name': String(editingBooking.Name || editingBooking.name || ''),
            'phone': String(editingBooking.Phone || editingBooking.phone || ''),
            'bus': String(editingBooking.Bus || editingBooking.bus || ''),
            'time': strictTime,
            'date': cleanDate,
            'pickup': String(editingBooking.Pickup || editingBooking.pickup || ''),
            'destination': String(editingBooking.Destination || editingBooking.destination || ''),
            'maleSeats': String(editingBooking["Male Seat"] || editingBooking.maleSeats || ''),
            'femaleSeats': String(editingBooking["Female Seat"] || editingBooking.femaleSeats || ''),
            'payment': String(editingBooking.Payment || editingBooking.payment || 'Pending'),
            'total': cleanTotal,
            'status': String(editingBooking.Status || editingBooking.status || 'Confirmed')
        };

        // Append lowercase keys (standard)
        Object.entries(payload).forEach(([key, val]) => params.append(key, val));

        // Append EXACT SHEET HEADER keys (backup for script matching)
        params.append('Name', payload.name);
        params.append('Phone', payload.phone);
        params.append('Bus', payload.bus);
        params.append('Time', payload.time);
        params.append('Date', payload.date);
        params.append('Pickup', payload.pickup);
        params.append('Destination', payload.destination);
        params.append('Male Seat', payload.maleSeats);
        params.append('Female Seat', payload.femaleSeats);
        // Add Plural Variations just in case
        params.append('Male Seats', payload.maleSeats);
        params.append('Female Seats', payload.femaleSeats);
        params.append('Payment', payload.payment);
        params.append('Total', payload.total);
        params.append('Status', payload.status);

        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: params,
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        Swal.fire({
            title: 'Saved!',
            text: 'Data sent to server.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            customClass: { popup: 'rounded-3xl' }
        });

        closeEditModal();
        // Delay fetch slightly to allow script to write
        setTimeout(fetchBookings, 1500); 
    } catch (error) {
        Swal.fire('Error', 'Failed to update booking', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Helper for input change in Edit Modal
  const handleEditChange = (field: string, value: any) => {
    if (!editingBooking) return;
    
    setEditingBooking(prev => {
        if (!prev) return null;
        const newState = { ...prev };
        
        // Update the direct field using type assertion to allow dynamic assignment
        (newState as any)[field] = value;

        // Synchronize fields explicitly to avoid 'Male' matching 'Female' substring issues in loose checks
        if (field === 'Name' || field === 'name') {
            newState.Name = value;
            newState.name = value;
        }
        else if (field === 'Phone' || field === 'phone') {
            newState.Phone = value;
            newState.phone = value;
        }
        else if (field === 'Bus' || field === 'bus') {
            newState.Bus = value;
            newState.bus = value;
        }
        else if (field === 'Date' || field === 'dateFormatted') {
            newState.Date = value;
            newState.dateFormatted = value;
        }
        else if (field === 'Time' || field === 'time') {
            newState.Time = value;
            newState.time = value;
        }
        else if (field === 'Pickup' || field === 'pickup') {
            newState.Pickup = value;
            newState.pickup = value;
        }
        else if (field === 'Destination' || field === 'destination') {
            newState.Destination = value;
            newState.destination = value;
        }
        // Strict checks for seats
        else if (field === 'Male Seat' || field === 'maleSeats') {
            newState["Male Seat"] = value;
            newState.maleSeats = value;
        }
        else if (field === 'Female Seat' || field === 'femaleSeats') {
            newState["Female Seat"] = value;
            newState.femaleSeats = value;
        }
        else if (field === 'Total' || field === 'totalAmount') {
            newState.Total = value;
            newState.totalAmount = value;
        }
        else if (field === 'Payment' || field === 'payment') {
            newState.Payment = value;
            newState.payment = value;
        }
        else if (field === 'Status' || field === 'status') {
            newState.Status = value;
            newState.status = value;
        }

        return newState;
    });
  };

  // Auto-Calculate Total based on entered seats and bus price
  const handleAutoCalculate = () => {
    if (!editingBooking) return;
    const busName = editingBooking.Bus || editingBooking.bus || "";
    const service = BUS_SERVICES[busName];
    
    if (!service) {
        Swal.fire({
            title: 'Unknown Bus',
            text: 'Please select a valid Bus Service to calculate the price.',
            icon: 'warning',
            customClass: { popup: 'rounded-3xl' }
        });
        return;
    }

    const mVal = String(editingBooking["Male Seat"] || editingBooking.maleSeats || "");
    const fVal = String(editingBooking["Female Seat"] || editingBooking.femaleSeats || "");

    // Count seats based on commas (e.g. "1,2,3" = 3 seats) or non-empty string
    const mCount = mVal.trim() ? mVal.split(',').length : 0;
    const fCount = fVal.trim() ? fVal.split(',').length : 0;

    const total = (mCount + fCount) * service.price;
    
    // Use the helper to ensure all keys update
    handleEditChange('Total', total);
  };

  // Check if we are editing a pending booking (for modal helper text)
  const isEditPending = editingBooking ? (
    String(editingBooking.Status || editingBooking.status || '').trim().toLowerCase() === 'new' ||
    String(editingBooking.Status || editingBooking.status || '').trim().toLowerCase() === 'pending'
  ) : false;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        </div>

        <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Admin Portal</h2>
            <p className="text-slate-500 text-sm">Secure Authentication Required</p>
          </div>

          <div className="space-y-6">
            {/* Biometric Button */}
            {biometricAvailable && !showPasswordInput && (
              <div className="space-y-4">
                 <button 
                  onClick={handleBiometricAuth}
                  className="w-full py-6 rounded-2xl bg-white dark:bg-slate-950 border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all group flex flex-col items-center gap-3 shadow-lg hover:shadow-primary/20"
                >
                   <Fingerprint size={48} className="text-primary group-hover:scale-110 transition-transform" />
                   <span className="font-bold text-slate-700 dark:text-slate-300">Tap to Authenticate</span>
                </button>
                <div className="text-center">
                  <button 
                    onClick={() => setShowPasswordInput(true)}
                    className="text-sm font-bold text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
                  >
                    <KeyRound size={14} /> Use Access Key
                  </button>
                </div>
              </div>
            )}

            {/* Password Fallback */}
            {showPasswordInput && (
              <form onSubmit={handleLogin} className="space-y-6 animate-fade-in-up">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Access Key</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono text-center text-lg tracking-widest"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onExit}
                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                    >
                        Unlock
                    </button>
                </div>

                {biometricAvailable && (
                   <div className="text-center pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowPasswordInput(false)}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      Use Biometrics
                    </button>
                   </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white relative">
      {/* Top Bar */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <LayoutDashboard size={24} />
             </div>
             <div>
                <h1 className="text-xl font-bold leading-none">Dashboard</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">LAGAN BUS ADMIN</p>
             </div>
          </div>
          
          {/* View Toggles */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1">
             <button 
                onClick={() => setViewMode('pending')}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === 'pending' 
                    ? 'bg-white dark:bg-slate-900 text-amber-500 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
             >
                <Bell size={16} /> 
                <span className="hidden sm:inline">Pending</span>
                {pendingBookings.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        {pendingBookings.length}
                    </span>
                )}
             </button>
             <button 
                onClick={() => setViewMode('active')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === 'active' 
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
             >
                <Calendar size={16} /> <span className="hidden sm:inline">Active</span>
             </button>
             <button 
                onClick={() => setViewMode('archive')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === 'archive' 
                    ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
             >
                <Archive size={16} /> <span className="hidden sm:inline">Archive</span>
             </button>
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={() => fetchBookings()} 
                className="p-2 text-slate-500 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                title="Refresh Data"
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
             </button>
             <button 
                onClick={onExit}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
            >
                <LogOut size={16} />
                <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertCircle size={80} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                    Pending Review
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {pendingBookings.length}
                </h3>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Users size={80} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Total Confirmed Pax</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {totalPassengers}
                </h3>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <DollarSign size={80} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                    Total Revenue
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    LKR {(totalRevenue / 1000).toFixed(1)}k
                </h3>
            </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by Name, Phone, or ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
                />
            </div>
            <div className="flex gap-4">
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Filter size={18} />
                    </div>
                    <input 
                        type="date" 
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none shadow-sm"
                    />
                </div>
            </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs whitespace-nowrap">ID</th>
                            <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs whitespace-nowrap">Passenger</th>
                            <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs whitespace-nowrap">Trip</th>
                            <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs whitespace-nowrap">Schedule</th>
                            <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs whitespace-nowrap">
                                {viewMode === 'pending' ? 'Requested Seats' : 'Assigned Seats'}
                            </th>
                            <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs whitespace-nowrap">Status</th>
                            <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-right whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                                    <BusLoader text={`Loading ${viewMode} bookings...`} />
                                </td>
                            </tr>
                        ) : filteredBookings.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    No {viewMode} bookings found.
                                </td>
                            </tr>
                        ) : (
                            filteredBookings.map((b, idx) => {
                                const id = b["Booking ID"] || b["Booking Id"] || `#${idx + 1}`;
                                const statusStr = String(b.Status || b.status || '');
                                const isPending = statusStr.trim().toLowerCase() === 'pending' || statusStr.trim().toLowerCase() === 'new';
                                
                                return (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    {/* ID */}
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">{id}</td>
                                    
                                    {/* Passenger */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-bold text-slate-900 dark:text-white">{b.Name || b.name}</div>
                                        <div className="text-xs text-slate-500">{b.Phone || b.phone}</div>
                                    </td>

                                    {/* Trip (Bus + Route) */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-primary font-medium text-xs">
                                                <Bus size={12} />
                                                {b.Bus || b.bus}
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                                                <span>{b.Pickup || b.pickup}</span>
                                                <span>→</span>
                                                <span>{b.Destination || b.destination}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Schedule */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                                <Calendar size={12} className="text-slate-400" />
                                                {formatDisplayDate(b.Date || b.dateFormatted)}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                <Clock size={12} />
                                                {formatTimeStrict(b.Time || b.time)}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Seats - Detailed List */}
                                    <td className="px-6 py-4 max-w-[200px]">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-start gap-1.5">
                                                <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 rounded flex-shrink-0 mt-0.5">Male</span>
                                                {isPending ? (
                                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded">
                                                        {b["Male Seat"] || b.maleSeats || 0} seats to assign
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white break-words leading-tight">
                                                        {b["Male Seat"] || b.maleSeats || <span className="text-slate-400 italic font-sans font-normal">None</span>}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-start gap-1.5">
                                                <span className="text-[10px] font-bold uppercase text-pink-600 bg-pink-100 dark:bg-pink-900/40 px-1.5 rounded flex-shrink-0 mt-0.5">Fem</span>
                                                {isPending ? (
                                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded">
                                                        {b["Female Seat"] || b.femaleSeats || 0} seats to assign
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white break-words leading-tight">
                                                        {b["Female Seat"] || b.femaleSeats || <span className="text-slate-400 italic font-sans font-normal">None</span>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Status / Payment */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col items-start gap-1">
                                            {isPending ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">
                                                    Needs Review
                                                </span>
                                            ) : (
                                                <>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                    String(b.Payment || b.payment || 'pending').toLowerCase().includes('paid') 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {b.Payment || b.payment || 'Pending'}
                                                </span>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    LKR {(b.Total || b.totalAmount || 0).toLocaleString()}
                                                </span>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-2">
                                            {isPending ? (
                                                <button 
                                                    onClick={() => handleApprove(b)}
                                                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-green-500/20 transition-all"
                                                >
                                                    <CheckCircle size={14} /> Approve
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => generateTicketPDF(b)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            )}
                                            
                                            <button 
                                                onClick={() => openEditModal(b)}
                                                className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                                                title="Edit & Assign Seats"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(b)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 flex justify-between items-center">
                <span>Showing {filteredBookings.length} records in {viewMode}</span>
                <span>Sorted by Newest</span>
            </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Edit size={20} className="text-primary" />
                        Edit Booking <span className="text-slate-400 font-mono text-base">{editingBooking["Booking ID"] || editingBooking["Booking Id"]}</span>
                    </h3>
                    <button 
                        onClick={() => closeEditModal()}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="edit-form" onSubmit={handleUpdate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Info</h4>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Customer Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                        value={editingBooking.Name || editingBooking.name || ''}
                                        onChange={e => handleEditChange('Name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                        value={editingBooking.Phone || editingBooking.phone || ''}
                                        onChange={e => handleEditChange('Phone', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Trip Info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Trip Details</h4>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Bus Service</label>
                                    <select 
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                        value={editingBooking.Bus || editingBooking.bus || ''}
                                        onChange={e => {
                                            handleEditChange('Bus', e.target.value);
                                            // Auto-update time if bus changes
                                            if (BUS_SERVICES[e.target.value]) {
                                                handleEditChange('Time', BUS_SERVICES[e.target.value].time);
                                            }
                                        }}
                                    >
                                        {Object.keys(BUS_SERVICES).map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Date</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                            value={editingBooking.Date || editingBooking.dateFormatted || ''}
                                            onChange={e => handleEditChange('Date', e.target.value)}
                                            placeholder="MM/DD/YYYY"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Time</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                            value={formatTimeStrict(editingBooking.Time || editingBooking.time)}
                                            onChange={e => handleEditChange('Time', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Route & Seats */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                    <span>Route & Seats</span>
                                    {isEditPending && (
                                        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                            <AlertCircle size={10} /> Assign Seats Here
                                        </span>
                                    )}
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Pickup</label>
                                        <select 
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                            value={editingBooking.Pickup || editingBooking.pickup || ''}
                                            onChange={e => handleEditChange('Pickup', e.target.value)}
                                        >
                                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Destination</label>
                                        <select 
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                            value={editingBooking.Destination || editingBooking.destination || ''}
                                            onChange={e => handleEditChange('Destination', e.target.value)}
                                        >
                                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="block text-sm font-bold mb-1.5 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                            Male Seat(s) <Armchair size={14} />
                                        </label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                                            value={editingBooking["Male Seat"] || editingBooking.maleSeats || ''}
                                            onChange={e => handleEditChange('Male Seat', e.target.value)}
                                            placeholder="Assign Numbers (e.g. 1, 2)"
                                        />
                                        {isEditPending && (
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Requested Count: <span className="font-bold text-slate-600 dark:text-slate-300">{originalBooking?.["Male Seat"] || originalBooking?.maleSeats || 0}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1.5 text-pink-600 dark:text-pink-400 flex items-center gap-1">
                                            Female Seat(s) <Armchair size={14} />
                                        </label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 outline-none font-bold text-center"
                                            value={editingBooking["Female Seat"] || editingBooking.femaleSeats || ''}
                                            onChange={e => handleEditChange('Female Seat', e.target.value)}
                                            placeholder="Assign Numbers (e.g. 4, 5)"
                                        />
                                        {isEditPending && (
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Requested Count: <span className="font-bold text-slate-600 dark:text-slate-300">{originalBooking?.["Female Seat"] || originalBooking?.femaleSeats || 0}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Payment */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment & Status</h4>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Payment Status</label>
                                    <select 
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                        value={editingBooking.Payment || editingBooking.payment || 'Pending'}
                                        onChange={e => handleEditChange('Payment', e.target.value)}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Failed">Failed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Booking Status</label>
                                    <select 
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none"
                                        value={editingBooking.Status || editingBooking.status || 'Confirmed'}
                                        onChange={e => handleEditChange('Status', e.target.value)}
                                    >
                                        <option value="New">New (Pending)</option>
                                        <option value="Confirmed">Confirmed</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Total Amount (LKR)</label>
                                        <button 
                                            type="button" 
                                            onClick={handleAutoCalculate}
                                            className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded transition-colors"
                                            title="Calculate based on Bus Price x Seats"
                                        >
                                            <Calculator size={12} /> Auto-Calculate
                                        </button>
                                    </div>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary outline-none font-bold text-lg"
                                        value={String(editingBooking.Total || editingBooking.totalAmount || 0).replace(/,/g, '')}
                                        onChange={e => handleEditChange('Total', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950/50">
                    <button 
                        onClick={() => closeEditModal()}
                        className="px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        type="button"
                    >
                        Cancel
                    </button>
                    <button 
                        form="edit-form"
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;