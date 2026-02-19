import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Calendar, Clock, MapPin, User, Phone, Bus, Users, CreditCard, ChevronDown } from 'lucide-react';
import { BUS_SERVICES, CITIES, ADMIN_WHATSAPP_NUMBER, BANK_DETAILS } from '../constants';
import { BookingFormData } from '../types';

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    phone: '',
    from: '',
    to: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '',
    bus: '',
    maleSeats: 0,
    femaleSeats: 0
  });

  const handleBusChange = (busName: string) => {
    const service = BUS_SERVICES[busName];
    setFormData(prev => ({
      ...prev,
      bus: busName,
      time: service ? service.time : ''
    }));
  };

  const calculateTotal = () => {
    const service = BUS_SERVICES[formData.bus];
    if (!service) return 0;
    return service.price * (formData.maleSeats + formData.femaleSeats);
  };

  const showBankDetails = () => {
    const total = calculateTotal();
    Swal.fire({
      title: 'Payment Details',
      html: `
        <div class="text-left space-y-4">
          <p class="text-center font-bold text-primary dark:text-primary-light text-lg mb-4">
            Transfer LKR ${total.toLocaleString()} to:
          </p>
          <div class="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
            <p class="text-sm text-slate-500 uppercase tracking-wider mb-2">Bank Details</p>
            <p><strong>Bank:</strong> ${BANK_DETAILS.bankName}</p>
            <p><strong>Account:</strong> ${BANK_DETAILS.accountNumber}</p>
            <p><strong>Name:</strong> ${BANK_DETAILS.accountName}</p>
            <p><strong>Branch:</strong> ${BANK_DETAILS.branch}</p>
          </div>
          <div class="text-sm text-slate-500 text-center">
            Use <strong>${formData.name || 'Your Name'}</strong> as reference
          </div>
        </div>
      `,
      confirmButtonText: 'Got it',
      confirmButtonColor: '#0066FF',
      customClass: {
        popup: 'rounded-3xl'
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Validation
    if (formData.maleSeats === 0 && formData.femaleSeats === 0) {
      Swal.fire({ 
          title: 'Seat Selection Required', 
          text: 'Please select at least one male or female seat.', 
          icon: 'warning', 
          confirmButtonColor: '#0066FF',
          customClass: { popup: 'rounded-3xl' }
      });
      return;
    }

    if (formData.phone.length < 9) {
      Swal.fire({ 
          title: 'Invalid Phone Number', 
          text: 'Please enter a valid phone number (e.g., 0771234567).', 
          icon: 'warning', 
          confirmButtonColor: '#0066FF',
          customClass: { popup: 'rounded-3xl' }
      });
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="glass-card rounded-[2rem] md:rounded-[2.5rem] shadow-soft overflow-hidden animate-fade-in-up">
      <div className="p-6 md:p-12">
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-inner">
                <Calendar className="w-6 h-6 md:w-7 md:h-7" />
             </div>
             <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Plan Your Journey</h2>
                <p className="text-slate-500 text-xs md:text-sm">Fill in the details to reserve your seat</p>
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* Main Inputs Grid */}
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-5 md:gap-y-6">
            
            {/* Input Group: Personal */}
            <div className="col-span-full mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Passenger Info
                </h3>
                <div className="grid md:grid-cols-2 gap-5 md:gap-6">
                    <div className="relative group">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                className="w-full pl-11 md:pl-12 pr-4 py-3.5 md:py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                        </div>
                    </div>
                    <div className="relative group">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">WhatsApp Number</label>
                        <div className="relative">
                            <input
                                type="tel"
                                required
                                pattern="[0-9]*"
                                className="w-full pl-11 md:pl-12 pr-4 py-3.5 md:py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="07XXXXXXXX"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 12)})}
                            />
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Group: Route */}
            <div className="col-span-full border-t border-slate-200/50 dark:border-slate-800/50 pt-6 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Route & Service
                </h3>
                <div className="grid md:grid-cols-2 gap-5 md:gap-6">
                    <div className="relative group">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">From</label>
                        <div className="relative">
                            <select
                                required
                                className="w-full pl-11 md:pl-12 pr-10 py-3.5 md:py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium appearance-none text-slate-900 dark:text-white"
                                value={formData.from}
                                onChange={e => setFormData({...formData, from: e.target.value})}
                            >
                                <option value="">Select Origin</option>
                                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                    
                    <div className="relative group">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">To</label>
                        <div className="relative">
                            <select
                                required
                                className="w-full pl-11 md:pl-12 pr-10 py-3.5 md:py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium appearance-none text-slate-900 dark:text-white"
                                value={formData.to}
                                onChange={e => setFormData({...formData, to: e.target.value})}
                            >
                                <option value="">Select Destination</option>
                                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                required
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full pl-11 md:pl-12 pr-4 py-3.5 md:py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium text-slate-900 dark:text-white"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Bus Service</label>
                        <div className="relative">
                            <select
                                required
                                className="w-full pl-11 md:pl-12 pr-10 py-3.5 md:py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium appearance-none text-slate-900 dark:text-white"
                                value={formData.bus}
                                onChange={e => handleBusChange(e.target.value)}
                            >
                                <option value="">Select Bus</option>
                                {Object.keys(BUS_SERVICES).map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <Bus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Seat Selection Cards */}
          <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Seat Allocation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 md:p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group cursor-pointer">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 transition-colors">Male Seats</span>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-500 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                </div>
                <div className="relative">
                    <select 
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-bold text-center appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                        value={formData.maleSeats}
                        onChange={e => setFormData({...formData, maleSeats: parseInt(e.target.value)})}
                    >
                        {[...Array(11)].map((_, i) => <option key={i} value={i}>{i} Seat{i!==1 && 's'}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" size={16} />
                </div>
              </div>
              
              <div className="p-5 md:p-6 rounded-3xl border border-pink-100 dark:border-pink-900/30 bg-pink-50/50 dark:bg-pink-900/10 hover:border-pink-500 hover:shadow-lg hover:shadow-pink-500/10 transition-all duration-300 group cursor-pointer">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-pink-600 dark:text-pink-400 group-hover:text-pink-700 transition-colors">Female Seats</span>
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-full text-pink-500 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                </div>
                <div className="relative">
                    <select 
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-800 font-bold text-center appearance-none focus:ring-2 focus:ring-pink-500 outline-none transition-shadow"
                        value={formData.femaleSeats}
                        onChange={e => setFormData({...formData, femaleSeats: parseInt(e.target.value)})}
                    >
                        {[...Array(11)].map((_, i) => <option key={i} value={i}>{i} Seat{i!==1 && 's'}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-300 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer / Total */}
          {formData.bus && (
            <div className="rounded-[1.5rem] md:rounded-3xl bg-slate-900 p-1 shadow-2xl shadow-slate-900/20">
                <div className="rounded-[1.2rem] md:rounded-[20px] bg-gradient-to-r from-slate-900 to-slate-800 p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <div className="text-center md:text-left">
                            <p className="text-slate-400 text-xs md:text-sm mb-1 uppercase tracking-wider font-semibold">Total Estimated Amount</p>
                            <div className="flex items-baseline gap-2 justify-center md:justify-start">
                                <span className="text-3xl md:text-4xl font-black text-white tracking-tight">LKR {calculateTotal().toLocaleString()}</span>
                                <span className="text-slate-500 text-xs md:text-sm">/ {formData.maleSeats + formData.femaleSeats} seats</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <button
                                type="button"
                                onClick={showBankDetails}
                                className="flex-1 px-6 py-3.5 md:py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/10 flex items-center justify-center"
                            >
                                <CreditCard className="mr-2 md:mr-0" size={20} />
                                <span className="md:hidden">Bank Info</span>
                            </button>
                            <button
                                type="submit"
                                className="flex-[3] px-8 py-3.5 md:py-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:shadow-primary/40"
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-5 h-5 md:w-6 md:h-6" alt="WA" />
                                <span>Confirm Booking</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default BookingForm;