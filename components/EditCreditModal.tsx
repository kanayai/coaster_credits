import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Camera, Save } from 'lucide-react';
import { Credit, Coaster } from '../types';

interface EditCreditModalProps {
  credit: Credit;
  coaster: Coaster;
  onClose: () => void;
}

const EditCreditModal: React.FC<EditCreditModalProps> = ({ credit, coaster, onClose }) => {
  const { updateCredit } = useAppContext();
  
  const [date, setDate] = useState(credit.date);
  const [notes, setNotes] = useState(credit.notes || '');
  const [photo, setPhoto] = useState<File | undefined>(undefined);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCredit(credit.id, date, notes, photo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in-down">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h3 className="font-bold text-white">Edit Entry</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="text-sm font-medium text-primary mb-2">
            {coaster.name} <span className="text-slate-500">at {coaster.park}</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Date Ridden</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Update Photo</label>
            <div className="relative">
              <input 
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0])}
                className="hidden"
                id="edit-photo-upload"
              />
              <label htmlFor="edit-photo-upload" className="w-full bg-slate-900 border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-900/80 transition-colors text-slate-400">
                <Camera size={18} />
                <span className="text-sm">{photo ? photo.name : "Change/Add Photo"}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none h-24 text-sm"
              placeholder="Ride experience..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCreditModal;