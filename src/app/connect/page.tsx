"use client";

import React from "react";
import Link from "next/link";
import { providers } from "@/lib/providers";

export default function ConnectIndexPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen flex flex-col justify-center">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-4">Select Target Environment</h1>
        <p className="text-surface-400">Choose a cloud provider to connect your infrastructure to CloudGuard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <Link 
              key={provider.id} 
              href={`/connect/${provider.id.toLowerCase()}`}
              className="card p-6 flex flex-col items-center text-center transition-all hover:bg-surface-800 hover:border-surface-600 hover:-translate-y-1 group"
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg transition-transform group-hover:scale-110"
                style={{ backgroundColor: provider.color }}
              >
                <Icon size={32} />
              </div>
              <h3 className="font-semibold text-white mb-2">{provider.name}</h3>
              <p className="text-xs text-surface-400 line-clamp-2">{provider.description}</p>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-12 text-center">
        <Link href="/settings" className="btn-outline">Cancel</Link>
      </div>
    </div>
  );
}
