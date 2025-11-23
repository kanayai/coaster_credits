import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, User, CheckCircle2 } from 'lucide-react';

const ProfileManager: React.FC = () => {
  const { users, activeUser, switchUser, addUser } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      addUser(newUserName.trim());
      setNewUserName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold">Rider Profiles</h2>
      
      <div className="grid grid-cols-1 gap-3">
        {users.map(user => (
          <button
            key={user.id}
            onClick={() => switchUser(user.id)}
            className={`flex items-center p-4 rounded-xl border transition-all ${
              user.id === activeUser.id 
                ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <div className={`w-12 h-12 rounded-full ${user.avatarColor} flex items-center justify-center text-lg font-bold shadow-lg mr-4`}>
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <h3 className={`font-semibold text-lg ${user.id === activeUser.id ? 'text-white' : 'text-slate-200'}`}>
                {user.name}
              </h3>
              {user.id === activeUser.id && (
                  <span className="text-xs text-primary font-medium flex items-center mt-1">
                      <CheckCircle2 size={12} className="mr-1"/> Active
                  </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {!isAdding ? (
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition flex items-center justify-center gap-2"
        >
          <UserPlus size={20} />
          Add Family Member
        </button>
      ) : (
        <form onSubmit={handleAdd} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <label className="block text-sm text-slate-400 mb-2">Name</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    autoFocus
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Enter name..."
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                />
                <button 
                    type="submit"
                    disabled={!newUserName.trim()}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                    Add
                </button>
                <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-slate-400 px-3 hover:text-white"
                >
                    Cancel
                </button>
            </div>
        </form>
      )}
      
      <div className="mt-12 p-4 bg-slate-800/50 rounded-xl text-xs text-slate-500 text-center">
          <p>CoasterCount Pro v1.0.0</p>
          <p>Built for Enthusiasts</p>
      </div>
    </div>
  );
};

export default ProfileManager;
