import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Loader2, PlusCircle, Search } from 'lucide-react'
import api from '../lib/api'

export default function JobBoard() {
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const user = useAuthStore(state => state.user)

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await api.getJobs()
        setJobs(data)
      } catch (err) {
        console.error('Failed to load jobs:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchJobs()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Open Positions</h1>
          {user?.role === 'HR' && (
            <Link to="/jobs/create" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-indigo-600/30">
              <PlusCircle className="w-5 h-5" /> Post Job
            </Link>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
              <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 group cursor-pointer flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{job.title}</h3>
                  <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full border border-slate-700">{job.job_type}</span>
                </div>
                <p className="text-slate-400 text-sm line-clamp-2 mb-4 flex-grow">{job.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {job.skills_required.map(skill => (
                    <span key={skill} className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-xs rounded-md border border-indigo-500/20">{skill}</span>
                  ))}
                </div>
                <Link to={`/jobs/${job.id}`} className="block text-center w-full bg-slate-800 hover:bg-indigo-600 text-white py-2 rounded-xl transition-colors font-medium">
                  {user?.role === 'HR' ? 'View Details' : 'Apply Now'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
