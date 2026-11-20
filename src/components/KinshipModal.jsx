import { useMemo, useState } from 'react';
import { ArrowLeftRight, ChevronRight, GitCompare, Route, Users, X } from 'lucide-react';
import { REGIONS, REGION_LABELS, computeKinship, createKinshipGraph } from '@shared/kinship.js';
import { Button, Modal } from './ui.jsx';
import SearchBox from './SearchBox.jsx';

/** Đại từ dùng khi nói chuyện: lấy từ đầu ("Bác họ" → "bác", "Em trai" → "em", "Ông chú" → "ông") */
const speech = (term) => term.split(' ')[0].toLowerCase();

function Slot({ label, person, index, onPick, onClear }) {
  return (
    <div className="flex-1 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <p className="mb-1.5 text-xs font-bold text-stone-500 uppercase">{label}</p>
      {person ? (
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${person.gender === 'male' ? 'bg-male' : 'bg-female'}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{person.fullName}</p>
            <p className="text-xs text-stone-500">
              Đời {person.generation}
              {!person.isLineage && ` · ${person.gender === 'female' ? 'dâu' : 'rể'}`}
            </p>
          </div>
          <button onClick={onClear} className="rounded p-1 text-stone-400 hover:bg-stone-200" aria-label="Bỏ chọn">
            <X size={14} />
          </button>
        </div>
      ) : (
        <SearchBox index={index} onPick={onPick} placeholder="Chọn người…" />
      )}
    </div>
  );
}

/**
 * Tính xưng hô: tính trực tiếp trên client bằng cùng thuật toán với API /api/kinship (shared/kinship.js).
 */
export function KinshipCalculator({ index, initialA, initialB, onShowPath }) {
  const [aId, setA] = useState(initialA ?? null);
  const [bId, setB] = useState(initialB ?? null);
  const [region, setRegion] = useState('bac');
  const graph = useMemo(() => createKinshipGraph(index.members, index.marriages), [index]);
  const A = aId ? index.byId.get(aId) : null;
  const B = bId ? index.byId.get(bId) : null;
  const result = useMemo(() => (aId && bId ? computeKinship(graph, aId, bId) : null), [graph, aId, bId]);

  return (
    <div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row">
        <Slot label="Người A" person={A} index={index} onPick={(m) => setA(m.id)} onClear={() => setA(null)} />
        <button
          onClick={() => {
            setA(bId);
            setB(aId);
          }}
          className="rotate-90 self-center rounded-full border border-stone-300 p-2 text-stone-500 transition hover:bg-stone-100 sm:rotate-0"
          title="Đổi chỗ"
        >
          <ArrowLeftRight size={16} />
        </button>
        <Slot label="Người B" person={B} index={index} onPick={(m) => setB(m.id)} onClear={() => setB(null)} />
      </div>

      {result && !result.found && <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{result.explanation}</p>}

      {result?.found && (
        <div className="mt-4">
          <div className="mb-3 flex gap-1 rounded-lg bg-stone-100 p-1">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium ${region === r ? 'bg-white text-lacquer-700 shadow' : 'text-stone-500'}`}
              >
                {REGION_LABELS[r]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-lacquer-600/30 bg-lacquer-50 p-4 text-center">
              <p className="text-xs text-stone-500">{A.fullName} gọi {B.fullName} là</p>
              <p className="mt-1 text-2xl font-extrabold text-lacquer-700">{result.aCallsB[region]}</p>
            </div>
            <div className="rounded-xl border-2 border-lacquer-600/30 bg-lacquer-50 p-4 text-center">
              <p className="text-xs text-stone-500">{B.fullName} gọi {A.fullName} là</p>
              <p className="mt-1 text-2xl font-extrabold text-lacquer-700">{result.bCallsA[region]}</p>
            </div>
          </div>
          {!/^(Vợ|Chồng|Chính)/.test(result.aCallsB[region]) && (
            <p className="mt-2 text-center text-sm text-stone-600">
              Khi trò chuyện: <b>{A.fullName}</b> xưng “{speech(result.bCallsA[region])}”, gọi “{speech(result.aCallsB[region])}”.
            </p>
          )}

          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-stone-200 sm:block">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-stone-100 text-xs text-stone-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Vùng miền</th>
                <th className="px-3 py-1.5 text-left">A gọi B</th>
                <th className="px-3 py-1.5 text-left">B gọi A</th>
              </tr>
            </thead>
            <tbody>
              {REGIONS.map((r) => (
                <tr key={r} className={`border-t border-stone-100 ${r === region ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-1.5 text-stone-500">{REGION_LABELS[r]}</td>
                  <td className="px-3 py-1.5 font-medium">{result.aCallsB[r]}</td>
                  <td className="px-3 py-1.5 font-medium">{result.bCallsA[r]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <RelationPath index={index} ids={result.pathIds} lcaId={result.lca?.id} />
          <details className="group mt-3 rounded-2xl bg-paper/70 px-4 py-3 text-sm text-[#5b4e41]">
            <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
              <span className="inline-flex items-center gap-1.5">
                <ChevronRight size={15} className="transition-transform group-open:rotate-90" /> Giải thích chi tiết
              </span>
            </summary>
            <p className="mt-2 leading-relaxed whitespace-pre-line">{result.explanation}</p>
          </details>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={() => {
                onShowPath(result.pathIds, result.lca?.id);
                
              }}
            >
              <Route size={14} /> Hiển thị đường quan hệ trên cây
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


export default function KinshipModal({ index, initialA, initialB, onClose, onShowPath }) {
  return (
    <Modal title="Tính xưng hô tự động" icon={<GitCompare size={18} />} onClose={onClose} width="max-w-2xl">
      <KinshipCalculator
        index={index}
        initialA={initialA}
        initialB={initialB}
        onShowPath={(ids, lca) => {
          onShowPath(ids, lca);
          onClose();
        }}
      />
    </Modal>
  );
}

/** Sơ đồ đường quan hệ: A → … → tổ tiên chung → … → B */
function RelationPath({ index, ids, lcaId }) {
  const people = (ids ?? []).map((id) => index.byId.get(id)).filter(Boolean);
  if (people.length < 2) return null;
  return (
    <div className="mt-4 rounded-2xl border border-line bg-white p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-gold-600 uppercase">
        <Users size={13} /> Đường quan hệ
      </p>
      <ol className="stagger flex flex-wrap items-center gap-y-2">
        {people.map((p, i) => {
          const isLca = p.id === lcaId;
          const isEnd = i === 0 || i === people.length - 1;
          return (
            <li key={p.id} className="flex items-center">
              {i > 0 && <ChevronRight size={15} className="mx-1 shrink-0 text-[#c9b99f]" aria-hidden="true" />}
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] ${
                  isLca
                    ? 'border-[#2f8a5b]/40 bg-[#e9f6ef] font-semibold text-[#1f6b45]'
                    : isEnd
                      ? 'border-lacquer-200 bg-lacquer-50 font-semibold text-lacquer-800'
                      : 'border-line bg-paper/60 text-[#5b4e41]'
                }`}
              >
                <i className={`h-2 w-2 shrink-0 rounded-full ${p.gender === 'male' ? 'bg-male' : 'bg-female'}`} />
                <span className="font-serif">{p.fullName}</span>
                {isLca && <span className="rounded-full bg-[#2f8a5b] px-1.5 py-px text-[10px] font-bold text-white">Tổ chung</span>}
                <span className="text-[11px] font-normal text-muted">đ.{p.generation}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
