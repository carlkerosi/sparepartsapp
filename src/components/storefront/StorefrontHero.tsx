import React, { useState } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';

interface StorefrontHeroProps {
  onSearchVehicle: (query: string) => void;
  onExploreCatalog: () => void;
}

export const StorefrontHero: React.FC<StorefrontHeroProps> = ({
  onSearchVehicle,
  onExploreCatalog,
}) => {
  const [selectedSeries, setSelectedSeries] = useState('Range Rover Vogue');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const RANGE_ROVER_MODELS: Record<string, string[]> = {
    'Range Rover Vogue': [
      'Vogue L405 (2013-2022) 3.0 TDV6 / 4.4 SDV8',
      'Vogue L405 (2013-2022) 5.0 V8 Supercharged',
      'Vogue L322 (2002-2012) 3.6 / 4.4 TDV8',
      'New Range Rover L460 (2022+)',
    ],
    'Range Rover Sport': [
      'Sport L494 (2014-2022) 3.0 V6 Supercharged',
      'Sport L494 (2014-2022) 3.0 SDV6 / 4.4 SDV8',
      'Sport L494 5.0 SVR / V8 SC',
      'Sport L320 (2005-2013) 3.0 TDV6 / 5.0 V8',
      'New Range Rover Sport L461 (2022+)',
    ],
    'Range Rover Velar': [
      'Velar L560 (2017+) 2.0 Si4 / P250 / P300',
      'Velar L560 (2017+) 3.0 D300 / P380 V6',
    ],
    'Range Rover Evoque': [
      'Evoque L538 (2011-2018) 2.0 Si4 / 2.2 SD4',
      'Evoque L551 (2019+) 2.0 D200 / P250',
    ],
    'Discovery & Defender': [
      'Defender L663 (2020+) D250 / P300 / P400',
      'Discovery 4 & 5 (3.0 TDV6 / SDV6)',
    ],
  };

  const handleFitmentSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParts = ['Range Rover', selectedSeries, selectedModel, selectedYear].filter(Boolean);
    const query = queryParts.join(' ');
    onSearchVehicle(query);
  };

  return (
    <div className="relative border-b border-slate-200 bg-slate-900 text-white overflow-hidden">
      {/* Background Graphic Scrim */}
      <div className="absolute inset-0 z-0 opacity-25">
        <img
          src="/src/assets/images/hero_auto_parts_1792926666971.jpg"
          alt="Automotive spare parts catalog"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter saturate-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950/70" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Editorial Headline & Value Prop */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
              <span className="text-emerald-400 font-semibold">Nairobi Central Inventory</span>
              <span aria-hidden="true">·</span>
              <span>Range Rover Specialist</span>
              <span aria-hidden="true">·</span>
              <span>Landed Cost in KSh</span>
              <span aria-hidden="true">·</span>
              <span>M-Pesa Paybill 522522</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Range Rover OEM Spares Kenya. <br className="hidden sm:inline" />
              In Stock in Nairobi.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Specialist importer for Range Rover Vogue, Sport, Velar & Evoque. Direct stock of Brembo front & rear brake discs, ceramic brake pads, wear sensors, parking brake shoes, aluminum water pumps, expansion tanks, ZF 8-Speed transmission pans, oil coolers, and OEM filtration.
            </p>

            {/* Quick Action Link */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onExploreCatalog}
                className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Browse All Catalogue
              </button>
              <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant M-Pesa STK Prompt · Paybill 522522</span>
              </div>
            </div>
          </div>

          {/* Right Column: Vehicle Fitment Fast Finder Module */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-slate-900 bg-white shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Range Rover Fitment Selector</h2>
                  <p className="text-[11px] text-slate-500">Find guaranteed compatible parts for your chassis</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <Search className="w-4 h-4" />
                </div>
              </div>

              <form onSubmit={handleFitmentSearch} className="space-y-3">
                {/* Series Select */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    1. Select Range Rover Series
                  </label>
                  <select
                    value={selectedSeries}
                    onChange={(e) => {
                      setSelectedSeries(e.target.value);
                      setSelectedModel('');
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer font-medium text-slate-900"
                  >
                    {Object.keys(RANGE_ROVER_MODELS).map((series) => (
                      <option key={series} value={series}>
                        {series}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Select */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    2. Select Model / Chassis Engine
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer font-medium text-slate-900"
                  >
                    <option value="">-- All {selectedSeries} Variants --</option>
                    {(RANGE_ROVER_MODELS[selectedSeries] || []).map((mod) => (
                      <option key={mod} value={mod}>
                        {mod}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    3. Manufacturing Year (Optional)
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer text-slate-900"
                  >
                    <option value="">Any Year / Generation</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                    <option value="2018">2018</option>
                    <option value="2015">2015</option>
                    <option value="2010">2010</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Matched Parts</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
