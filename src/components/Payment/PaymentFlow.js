/**
 * 付款流程組件
 * 
 * 處理完整的付款流程：
 * 1. 方案選擇確認
 * 2. 付款方式選擇
 * 3. 條款同意
 * 4. 訂單創建
 * 5. 跳轉到綠界支付
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import paymentService from '../../services/paymentService';
import { systemLogger } from '../../utils/logger';
import LoadingSpinner from '../Common/LoadingSpinner';
import { RedemptionCodeInput } from '../Redemption/RedemptionCodeInput';

const PaymentFlow = ({ 
    planType = 'pro', 
    billingPeriod = 'monthly',
    onSuccess,
    onError,
    onCancel 
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Credit'); // 固定為信用卡
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [appliedRedemption, setAppliedRedemption] = useState(null);
    const [originalAmount, setOriginalAmount] = useState(null);
    const [finalAmount, setFinalAmount] = useState(null);

    // 獲取方案資訊
    const planPricing = paymentService.getPlanPricing();
    const currentPlan = planPricing[planType]?.[billingPeriod];
    // 固定使用信用卡定期定額，不需要選擇付款方式
    const paymentMethods = [{ value: 'Credit', label: '信用卡定期定額' }];

    // Initialize amounts
    useEffect(() => {
        if (currentPlan?.price) {
            setOriginalAmount(currentPlan.price);
            setFinalAmount(appliedRedemption ? calculateDiscountedAmount(currentPlan.price, appliedRedemption) : currentPlan.price);
        }
    }, [currentPlan, appliedRedemption]);

    useEffect(() => {
        systemLogger.info('PaymentFlow initialized:', {
            planType,
            billingPeriod,
            currentPlan
        });
    }, [planType, billingPeriod, currentPlan]);

    /**
     * Calculate discounted amount based on redemption
     */
    const calculateDiscountedAmount = (originalPrice, redemption) => {
        if (!redemption?.benefits) return originalPrice;

        const { benefits } = redemption;
        
        if (benefits.type === 'discount') {
            if (benefits.discountType === 'percentage') {
                const discountAmount = (originalPrice * benefits.discountPercentage) / 100;
                return Math.max(0, originalPrice - discountAmount);
            } else if (benefits.discountType === 'fixed') {
                return Math.max(0, originalPrice - benefits.discountAmount);
            }
        }
        
        return originalPrice;
    };

    /**
     * Handle successful redemption
     */
    const handleRedemptionSuccess = (redemptionData) => {
        setAppliedRedemption(redemptionData);
        
        systemLogger.info('Redemption applied to checkout:', {
            benefitType: redemptionData.benefits?.type,
            discountAmount: redemptionData.benefits?.discountAmount,
            originalAmount: currentPlan?.price
        });
    };

    /**
     * Handle redemption error
     */
    const handleRedemptionError = (error) => {
        systemLogger.error('Redemption error in checkout:', error);
        
        // Handle payment method requirement
        if (error.errorCode === 'PAYMENT_METHOD_REQUIRED') {
            setError('此兌換代碼需要綁定付款方式。請繼續完成付款流程以套用優惠。');
        } else {
            setError(`兌換失敗：${error.error || '請稍後再試'}`);
        }
    };

    /**
     * Handle redemption preview
     */
    const handleRedemptionPreview = (previewData) => {
        if (previewData?.benefits && currentPlan?.price) {
            const discountedAmount = calculateDiscountedAmount(currentPlan.price, previewData);
            setFinalAmount(discountedAmount);
        }
    };

    /**
     * 處理下一步
     */
    const handleNextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    /**
     * 處理上一步
     */
    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    /**
     * 處理付款方式變更
     */
    const handlePaymentMethodChange = (method) => {
        setPaymentMethod(method);
        systemLogger.info('Payment method selected:', { method });
    };

    /**
     * 處理條款同意變更
     */
    const handleTermsChange = (agreed) => {
        setAgreedToTerms(agreed);
    };

    /**
     * 創建訂單並跳轉到付款頁面
     */
    const handleCreateOrder = async () => {
        if (!agreedToTerms) {
            setError('請先同意服務條款和隱私政策');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            systemLogger.info('Creating payment order:', {
                planType,
                billingPeriod,
                paymentMethod
            });

            const result = await paymentService.createOrder({
                planType,
                billingPeriod,
                paymentMethod,
                redemptionCode: appliedRedemption?.code,
                originalAmount: originalAmount,
                finalAmount: finalAmount || currentPlan?.price
            });

            setOrderData(result);
            setCurrentStep(4); // 跳轉到確認頁面

            systemLogger.info('Order created successfully:', {
                orderId: result.orderId,
                amount: result.amount
            });

        } catch (error) {
            systemLogger.error('Failed to create order:', error);
            setError('創建訂單時發生錯誤，請稍後再試');
            
            if (onError) {
                onError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * 提交付款表單到綠界
     */
    const handleSubmitPayment = () => {
        if (!orderData) {
            setError('訂單資料不完整');
            return;
        }

        try {
            systemLogger.info('Submitting payment to ECPay:', {
                orderId: orderData.orderId
            });

            // 提交表單到綠界
            paymentService.submitPaymentForm(orderData);

        } catch (error) {
            systemLogger.error('Failed to submit payment:', error);
            setError('跳轉到付款頁面時發生錯誤');
            
            if (onError) {
                onError(error);
            }
        }
    };

    /**
     * 處理取消
     */
    const handleCancel = () => {
        systemLogger.info('Payment flow cancelled by user');
        
        if (onCancel) {
            onCancel();
        } else {
            navigate('/subscription');
        }
    };

    /**
     * 渲染步驟指示器
     */
    const renderStepIndicator = () => {
        const steps = [
            { number: 1, title: t('payment.form.confirmPlan') },
            { number: 2, title: t('payment.flow.selectPayment') },
            { number: 3, title: t('payment.form.confirmTerms') },
            { number: 4, title: t('payment.form.confirmPayment') }
        ];

        return (
            <div className="flex justify-center mb-8">
                <div className="flex items-center space-x-4">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                                currentStep >= step.number
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-600'
                            }`}>
                                {step.number}
                            </div>
                            <span className={`text-sm ${
                                currentStep >= step.number
                                    ? 'text-blue-600 font-medium'
                                    : 'text-gray-500'
                            }`}>
                                {step.title}
                            </span>
                            {index < steps.length - 1 && (
                                <div className={`w-8 h-0.5 ${
                                    currentStep > step.number
                                        ? 'bg-blue-600'
                                        : 'bg-gray-200'
                                }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };

    /**
     * 渲染方案確認步驟
     */
    const renderPlanConfirmation = () => (
        <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">{t('payment.form.confirmPlan')}</h2>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200 mb-6">
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {t('payment.plan.proPlan')}
                    </h3>
                    
                    {/* Price Display with Redemption */}
                    <div className="mb-2">
                        {appliedRedemption ? (
                            <div>
                                <div className="text-lg text-gray-500 line-through">
                                    NT$ {originalAmount?.toLocaleString()}
                                </div>
                                <div className="text-3xl font-bold text-green-600">
                                    NT$ {finalAmount?.toLocaleString()}
                                </div>
                                <div className="text-sm text-green-600 font-medium">
                                    {t('payment.redemption.applied')}
                                </div>
                            </div>
                        ) : (
                            <div className="text-3xl font-bold text-blue-600">
                                NT$ {currentPlan?.price?.toLocaleString()}
                            </div>
                        )}
                    </div>
                    
                    <div className="text-gray-600 mb-4">
                        每{currentPlan?.period}
                        {currentPlan?.discount && (
                            <span className="ml-2 text-green-600 text-sm">
                                ({currentPlan.discount})
                            </span>
                        )}
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">{t('payment.plan.features.title')}：</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center">
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {t('payment.plan.features.marketSentiment')}
                        </li>
                        <li className="flex items-center">
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {t('payment.plan.features.advancedAnalysis')}
                        </li>
                        <li className="flex items-center">
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {t('payment.plan.features.unlimitedWatchlist')}
                        </li>
                        <li className="flex items-center">
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {t('payment.plan.features.prioritySupport')}
                        </li>
                    </ul>
                </div>
            </div>

            {/* Redemption Code Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">{t('payment.redemption.title')}</h4>
                <p className="text-sm text-gray-600 mb-4">
                    {t('payment.redemption.description')}
                </p>
                
                <RedemptionCodeInput
                    location="checkout"
                    onPreviewSuccess={handleRedemptionPreview}
                    onRedemptionSuccess={handleRedemptionSuccess}
                    onRedemptionError={handleRedemptionError}
                    placeholder={t('payment.redemption.placeholder')}
                    showPreview={true}
                />

                {/* Applied Redemption Display */}
                {appliedRedemption && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <div className="text-sm font-medium text-green-800">
                                    {t('payment.redemption.applied')}
                                </div>
                                <div className="text-xs text-green-600">
                                    {t('payment.redemption.savings', { amount: (originalAmount - finalAmount)?.toLocaleString() })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-6">
                <button
                    onClick={handleCancel}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    {t('payment.form.cancel')}
                </button>
                <button
                    onClick={handleNextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('payment.form.confirmPlan')}
                </button>
            </div>
        </div>
    );

    /**
     * 渲染付款方式選擇步驟
     */
    const renderPaymentMethodSelection = () => (
        <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">{t('payment.flow.selectPayment')}</h2>
            
            <div className="space-y-3">
                {paymentMethods.map((method) => (
                    <label
                        key={method.value}
                        className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                            paymentMethod === method.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value={method.value}
                                checked={paymentMethod === method.value}
                                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                                className="mr-3"
                            />
                            <div>
                                <div className="font-medium text-gray-900">
                                    {method.label}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {method.description}
                                </div>
                            </div>
                        </div>
                    </label>
                ))}
            </div>

            <div className="flex justify-between mt-6">
                <button
                    onClick={handlePrevStep}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    {t('payment.form.previous')}
                </button>
                <button
                    onClick={handleNextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('payment.form.next')}
                </button>
            </div>
        </div>
    );

    /**
     * 渲染條款同意步驟
     */
    const renderTermsAgreement = () => (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">{t('payment.terms.title')}</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-64 overflow-y-auto">
                <h3 className="font-semibold mb-3">{t('payment.terms.serviceTermsTitle')}</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                    {t('payment.terms.serviceTerms', { returnObjects: true }).map((term, index) => (
                        <li key={index}>• {term}</li>
                    ))}
                </ul>

                <h3 className="font-semibold mt-4 mb-3">{t('payment.terms.privacyPolicyTitle')}</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                    {t('payment.terms.privacyPolicy', { returnObjects: true }).map((policy, index) => (
                        <li key={index}>• {policy}</li>
                    ))}
                </ul>
            </div>

            <label className="flex items-start space-x-3 mb-6">
                <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => handleTermsChange(e.target.checked)}
                    className="mt-1"
                />
                <span className="text-sm text-gray-700">
                    {t('payment.terms.agreement')}
                    <a href="/terms" target="_blank" className="text-blue-600 hover:underline mx-1">
                        {t('payment.terms.serviceTermsLink')}
                    </a>
                    {t('payment.terms.and')}
                    <a href="/privacy" target="_blank" className="text-blue-600 hover:underline mx-1">
                        {t('payment.terms.privacyPolicyLink')}
                    </a>
                </span>
            </label>

            <div className="flex justify-between">
                <button
                    onClick={handlePrevStep}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    {t('payment.form.previous')}
                </button>
                <button
                    onClick={handleCreateOrder}
                    disabled={!agreedToTerms || loading}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                        agreedToTerms && !loading
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {loading ? t('payment.form.creatingOrder') : t('payment.form.createOrder')}
                </button>
            </div>
        </div>
    );

    /**
     * 渲染付款確認步驟
     */
    const renderPaymentConfirmation = () => (
        <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">{t('payment.form.confirmPayment')}</h2>
            
            {orderData && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">訂單編號：</span>
                            <span className="font-mono text-sm">{orderData.orderId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">方案：</span>
                            <span>Pro 方案 ({currentPlan?.period}付)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">付款方式：</span>
                            <span>{paymentMethods.find(m => m.value === paymentMethod)?.label}</span>
                        </div>
                        
                        {/* Redemption Details */}
                        {appliedRedemption && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">兌換代碼：</span>
                                    <span className="font-mono text-sm">{appliedRedemption.code}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">原價：</span>
                                    <span className="line-through text-gray-500">
                                        NT$ {originalAmount?.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>折扣：</span>
                                    <span>-NT$ {(originalAmount - finalAmount)?.toLocaleString()}</span>
                                </div>
                            </>
                        )}
                        
                        <div className="flex justify-between text-lg font-semibold border-t pt-3">
                            <span>總金額：</span>
                            <span className={appliedRedemption ? "text-green-600" : "text-blue-600"}>
                                NT$ {orderData.amount?.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">付款注意事項：</p>
                        <ul className="space-y-1">
                            <li>• 點擊「前往付款」將跳轉到綠界支付頁面</li>
                            <li>• 請在 30 分鐘內完成付款，逾時訂單將自動取消</li>
                            <li>• 付款完成後將自動返回本網站</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    onClick={handleCancel}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    取消訂單
                </button>
                <button
                    onClick={handleSubmitPayment}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    前往付款
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                {renderStepIndicator()}

                {error && (
                    <div className="max-w-md mx-auto mb-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-red-800 text-sm">{error}</span>
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center mb-6">
                        <LoadingSpinner size="large" />
                    </div>
                )}

                {currentStep === 1 && renderPlanConfirmation()}
                {currentStep === 2 && renderPaymentMethodSelection()}
                {currentStep === 3 && renderTermsAgreement()}
                {currentStep === 4 && renderPaymentConfirmation()}
            </div>
        </div>
    );
};

export default PaymentFlow;