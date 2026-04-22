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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">Open Positions</h1>
          {user?.role === 'HR' && (
            <Link to="/jobs/create" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-blue-600/30">
              <PlusCircle className="w-5 h-5" /> Post Job
            </Link>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
              <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/5 shadow-sm group cursor-pointer flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">{job.job_type}</span>
                </div>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-grow">{job.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {job.skills_required.map(skill => (
                    <span key={skill} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">{skill}</span>
                  ))}
                </div>
                <Link to={`/jobs/${job.id}`} className="block text-center w-full bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white border border-slate-200 hover:border-blue-600 py-2 rounded-xl transition-colors font-medium">
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
