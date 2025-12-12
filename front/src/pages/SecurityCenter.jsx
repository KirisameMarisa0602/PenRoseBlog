import React, { useState } from 'react';
import { changePassword } from '@utils/api/userService';
import '@styles/pages/SecurityCenter.css';

export default function SecurityCenter() {
    const [pwdData, setPwdData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' }); // type: 'success' | 'error'
    const [pwdLoading, setPwdLoading] = useState(false);

    const handlePwdChange = async (e) => {
        e.preventDefault();
        if (!pwdData.oldPassword || !pwdData.newPassword || !pwdData.confirmPassword) {
            setPwdMsg({ text: '请填写完整信息', type: 'error' });
            return;
        }
        if (pwdData.newPassword !== pwdData.confirmPassword) {
            setPwdMsg({ text: '两次新密码输入不一致', type: 'error' });
            return;
        }
        if (pwdData.newPassword.length < 8 || pwdData.newPassword.length > 12) {
            setPwdMsg({ text: '新密码长度需在8-12位之间', type: 'error' });
            return;
        }
        setPwdLoading(true);
        setPwdMsg({ text: '', type: '' });
        try {
            const res = await changePassword({
                oldPassword: pwdData.oldPassword,
                newPassword: pwdData.newPassword
            });
            if (res.code === 200) {
                setPwdMsg({ text: '密码修改成功', type: 'success' });
                setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPwdMsg({ text: res.message || '修改失败', type: 'error' });
            }
        } catch (err) {
            setPwdMsg({ text: err.message || '请求异常', type: 'error' });
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <div className="security-center-page">
            <div className="security-container">
                <div className="security-header">
                    <div className="security-icon-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="security-main-icon">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <h2 className="security-title">安全中心</h2>
                    <p className="security-subtitle">保护您的账户安全，建议定期更换密码</p>
                </div>
                
                <div className="security-card">
                    <div className="card-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <h3>修改登录密码</h3>
                    </div>
                    
                    <form className="security-form" onSubmit={handlePwdChange}>
                        <div className="form-group">
                            <label>旧密码</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    value={pwdData.oldPassword}
                                    onChange={e => setPwdData({ ...pwdData, oldPassword: e.target.value })}
                                    placeholder="请输入当前使用的密码"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>新密码</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    value={pwdData.newPassword}
                                    onChange={e => setPwdData({ ...pwdData, newPassword: e.target.value })}
                                    placeholder="8-12位，建议包含字母和数字"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>确认新密码</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    value={pwdData.confirmPassword}
                                    onChange={e => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                                    placeholder="请再次输入新密码"
                                />
                            </div>
                        </div>
                        
                        {pwdMsg.text && (
                            <div className={`form-msg-box ${pwdMsg.type}`}>
                                {pwdMsg.type === 'success' ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="msg-icon"><polyline points="20 6 9 17 4 12"/></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="msg-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                )}
                                <span>{pwdMsg.text}</span>
                            </div>
                        )}

                        <button type="submit" className="security-btn" disabled={pwdLoading}>
                            {pwdLoading ? '正在提交...' : '确认修改'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
