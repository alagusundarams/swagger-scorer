import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockUser, mockTeams } from '../mocks';

export const OnboardingWizard = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        version: '',
        description: '',
        ownerTeamId: mockUser.teams[0],
        visibility: 'public' as 'public' | 'private' | 'owner-only',
        selectedTeams: [] as string[],
        requiresAuth: false,
    });

    const userTeams = mockTeams.filter(t => mockUser.teams.includes(t.id));
    const allTeams = mockTeams;

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = () => {
        alert('Product onboarding submitted for approval!');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-6">
                {/* Progress */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`flex-1 h-2 rounded-full mx-1 ${i <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                    <p className="text-sm text-gray-600 text-center">Step {step} of 3</p>
                </div>

                <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
                                        placeholder="e.g., User Service API"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Version *</label>
                                    <input
                                        type="text"
                                        value={formData.version}
                                        onChange={e => setFormData({ ...formData, version: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
                                        placeholder="e.g., v1.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
                                        rows={3}
                                        placeholder="What does this API do?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Owner Team *</label>
                                    <select
                                        value={formData.ownerTeamId}
                                        onChange={e => setFormData({ ...formData, ownerTeamId: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
                                    >
                                        {userTeams.map(team => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={handleNext}
                                    disabled={!formData.name || !formData.version || !formData.description}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Visibility */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Visibility & Access</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Who can see this product?</label>
                                    <div className="space-y-3">
                                        <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300">
                                            <input
                                                type="radio"
                                                checked={formData.visibility === 'public'}
                                                onChange={() => setFormData({ ...formData, visibility: 'public' })}
                                                className="mt-1 mr-3"
                                            />
                                            <div>
                                                <div className="font-semibold text-gray-900">🌐 Public (All Teams)</div>
                                                <div className="text-sm text-gray-600">Visible to all teams in organization</div>
                                            </div>
                                        </label>
                                        <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300">
                                            <input
                                                type="radio"
                                                checked={formData.visibility === 'private'}
                                                onChange={() => setFormData({ ...formData, visibility: 'private' })}
                                                className="mt-1 mr-3"
                                            />
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-900">🔒 Private (Specific Teams)</div>
                                                <div className="text-sm text-gray-600 mb-3">Choose which teams can see this</div>
                                                {formData.visibility === 'private' && (
                                                    <div className="space-y-2 mt-3">
                                                        {allTeams.map(team => (
                                                            <label key={team.id} className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.selectedTeams.includes(team.id)}
                                                                    onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setFormData({ ...formData, selectedTeams: [...formData.selectedTeams, team.id] });
                                                                        } else {
                                                                            setFormData({ ...formData, selectedTeams: formData.selectedTeams.filter(id => id !== team.id) });
                                                                        }
                                                                    }}
                                                                    className="mr-2"
                                                                />
                                                                <span className="text-sm">{team.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                        <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300">
                                            <input
                                                type="radio"
                                                checked={formData.visibility === 'owner-only'}
                                                onChange={() => setFormData({ ...formData, visibility: 'owner-only' })}
                                                className="mt-1 mr-3"
                                            />
                                            <div>
                                                <div className="font-semibold text-gray-900">👤 Owner Team Only</div>
                                                <div className="text-sm text-gray-600">Only your team can access</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between mt-6">
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Submit</h2>
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2">Product Information</h3>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-gray-600">Name:</span> {formData.name}</p>
                                        <p><span className="text-gray-600">Version:</span> {formData.version}</p>
                                        <p><span className="text-gray-600">Description:</span> {formData.description}</p>
                                        <p><span className="text-gray-600">Owner:</span> {userTeams.find(t => t.id === formData.ownerTeamId)?.name}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2">Visibility</h3>
                                    <p className="text-sm">
                                        {formData.visibility === 'public' && '🌐 Public - All teams'}
                                        {formData.visibility === 'private' && `🔒 Private - ${formData.selectedTeams.length} teams selected`}
                                        {formData.visibility === 'owner-only' && '👤 Owner team only'}
                                    </p>
                                </div>
                                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm text-yellow-800">
                                        ⚠️ This request will be submitted for Cloud Ops approval (1-2 business days)
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-between mt-6">
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700"
                                >
                                    Submit for Approval
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
