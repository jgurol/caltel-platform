
import { useState } from "react";
import { NavigationBar } from "@/components/NavigationBar";
import { QuickNavigation } from "@/components/QuickNavigation";
import { CircuitQuotesManagement } from "@/components/CircuitQuotesManagement";

const CircuitQuotes = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <NavigationBar />
      <QuickNavigation />
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Circuit Quotes</h1>
          <p className="text-gray-600">Research and compare carrier pricing before creating customer quotes</p>
        </div>

        <CircuitQuotesManagement />
      </div>
    </div>
  );
};

export default CircuitQuotes;
