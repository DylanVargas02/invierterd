"""Genera src/css/07-identidades.css: las cinco identidades visuales de Caoba.
Azul financiero es la predeterminada (sin atributo). Las demás se activan con data-skin en <html>.
Cada identidad define sus colores en claro y en oscuro, sus fuentes y sus radios."""
import pathlib
RAD=dict(azul=dict(hero=8,card=8,cardv=8,pill=6,btn=6,sheet=14,inp=4),pastel=dict(hero=22,card=20,cardv=20,pill=999,btn=999,sheet=26,inp=14),
 oscuro=dict(hero=14,card=14,cardv=14,pill=10,btn=10,sheet=20,inp=10),natural=dict(hero=4,card=4,cardv=4,pill=4,btn=4,sheet=10,inp=3),editorial=dict(hero=0,card=0,cardv=2,pill=2,btn=2,sheet=0,inp=0))
FONT=dict(azul=('"IBM Plex Sans"','"IBM Plex Sans"'),pastel=('Nunito','Nunito'),oscuro=('Manrope','Manrope'),natural=('Fraunces','"Work Sans"'),editorial=('"Source Serif 4"','Inter'))
SANS=',system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';SERIF=',Georgia,"Times New Roman",serif'
def pal(bg,surface,s2,ink,ink2,line,brand,brands,grow,grows,spend,spends,debt,debts,inv,invs,market,markets,deep,ondeep,glow,c,widget,cs):
    d=dict(bg=bg,surface=surface,**{'surface-2':s2},ink=ink,**{'ink-2':ink2},line=line,brand=brand,**{'brand-soft':brands},grow=grow,**{'grow-soft':grows},spend=spend,**{'spend-soft':spends},
      debt=debt,**{'debt-soft':debts},inv=inv,**{'inv-soft':invs},market=market,**{'market-soft':markets},goal=brand,**{'goal-soft':brands},**{'on-deep':ondeep},**{'hoja-c':glow},crema=surface if cs=='dark' else bg)
    for k,v in zip(['resumen','ingresos','gastos','ahorros','prestamos','mercado','metas'],deep):d['b-'+k]=v
    for i,v in enumerate(c,1):d['c%d'%i]=v
    d['widget']=widget;d['color-scheme']=cs;return d
P={
 'azul':(pal('#F3F5F8','#FFFFFF','#E8EDF3','#0B2545','#536378','#D8E0EA','#0B2545','#E3EAF3','#13805B','#E0F2EA','#B4232F','#FBE3E5','#9A5B00','#FBEBD0','#13505B','#DDEEF0','#1D63A8','#E1ECF8',
          ['#0B2545','#13505B','#6E1F2A','#13505B','#1B3A5C','#1D4E89','#0B2545'],'#FFFFFF','#8ED1F0',['#13505B','#C0662A','#2A9DD8','#B88A12','#A04A78','#4F8F8A','#0B2545','#6A5AA8'],'#0B2545','light'),
         pal('#0A1422','#101D2E','#172739','#E6ECF3','#9AABBF','#22344A','#7FB8E6','#14273D','#4CC38A','#10301F','#FF8A8A','#3A1A1E','#F0B55A','#35270B','#5FC4CF','#0D2E33','#8BB8F0','#14243D',
          ['#0E2A4A','#0F3E45','#5A1C24','#0F3E45','#16324F','#173E6E','#0E2A4A'],'#FFFFFF','#8ED1F0',['#4CC38A','#E08A4E','#6FB8E6','#D9B54A','#D27FAC','#7FC0BA','#9DC4EC','#A99BE6'],'#0E2A4A','dark')),
 'pastel':(pal('#FFFBF5','#FFFFFF','#F4EFE8','#2B2A33','#6F6B7A','#ECE6DC','#5B4BC4','#EFEAFB','#2E8B62','#DDF5E8','#B83B5B','#FBE1E8','#9A6400','#FCEFD6','#2E7AB8','#DDEEFB','#5B4BC4','#ECE8FB',
          ['#CFE7F8','#BDEBD3','#F8D7DF','#CFC6F7','#F6E3C3','#D9D2FA','#CFE7F8'],'#2B2A33','#5B4BC4',['#7CCBA2','#F2A65A','#7FB8E8','#E3C45B','#E79AB8','#8ED3CB','#9C8DE6','#B4A8F0'],'#CFE7F8','light'),
          pal('#1E1C26','#27242F','#302D3A','#F3F0F8','#B4AEC2','#3A3646','#C2B6F7','#332D4A','#8FDDB6','#1E3A2D','#F5A3B8','#3E2230','#F0C77A','#3A2E14','#9DCCF2','#1C3042','#C2B6F7','#2D2845',
          ['#2E3F52','#24453A','#4A2B36','#3A3358','#4A3D26','#36305A','#2E3F52'],'#F3F0F8','#C2B6F7',['#8FDDB6','#F2B27A','#9DCCF2','#EBD27A','#F0AFC6','#A3DCD5','#C2B6F7','#CFC4F7'],'#2E3F52','dark')),
 'oscuro':(None,pal('#0C1016','#141A22','#1C232D','#E6EAEF','#8A94A3','#232C38','#10B981','#0F2A22','#34D399','#0F2A22','#F87171','#3A1A1E','#FBBF24','#33270B','#34D399','#0F2A22','#93A4BC','#1C232D',
          ['#141A22','#141A22','#141A22','#141A22','#141A22','#141A22','#141A22'],'#F4F6F8','#34D399',['#10B981','#F59E0B','#60A5FA','#A78BFA','#F472B6','#2DD4BF','#94A3B8','#FB7185'],'#141A22','dark')),
 'natural':(pal('#F3ECE1','#FBF8F2','#EAE1D2','#3B2A20','#7A6656','#E2D6C4','#3B2A20','#EDE3D4','#4E6B2E','#E5EBD6','#A8452A','#F6E0D6','#8A5A12','#F3E6CC','#5E6B3A','#E5EBD6','#8A4B2E','#F3E3DA',
          ['#5E6B3A','#5E6B3A','#9E4E2C','#5E6B3A','#3B2A20','#8A4B2E','#5E6B3A'],'#FBF8F2','#E8D9A8',['#5E6B3A','#C0643C','#8A7A4A','#B88A12','#9E4E2C','#7A8F5A','#3B2A20','#A07850'],'#5E6B3A','light'),
          pal('#1A1410','#241C16','#2E241C','#F1E8DC','#BFAE9A','#3A2E24','#E8D9A8','#2E2618','#A9C07A','#25301A','#E59A7A','#3A2018','#E5B86A','#3A2C12','#A9C07A','#25301A','#E5A07A','#3A241A',
          ['#3E4626','#3E4626','#6A3420','#3E4626','#2E241C','#5E3420','#3E4626'],'#F1E8DC','#E8D9A8',['#A9C07A','#E5976A','#C9B98A','#E0BE5A','#E59A7A','#B4C994','#E8D9A8','#D2AE86'],'#3E4626','dark')),
 'editorial':(pal('#FFFFFF','#FFFFFF','#F2F2F2','#111111','#5E5E5E','#E2E2E2','#111111','#F0F0F0','#1F4D3A','#E3EEE8','#A3242A','#F7E1E2','#7A5200','#F5EBD6','#1F4D3A','#E3EEE8','#111111','#F0F0F0',
          ['#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF'],'#111111','#1F4D3A',['#111111','#1F4D3A','#6B6B6B','#9A9A9A','#3E7A60','#C4C4C4','#2F2F2F','#7FA892'],'#111111','light'),
          pal('#0E0E0E','#0E0E0E','#1A1A1A','#F2F2F2','#A8A8A8','#2A2A2A','#F2F2F2','#1F1F1F','#7FBF9F','#132A20','#F28B8E','#3A1A1C','#E5B86A','#33270B','#7FBF9F','#132A20','#F2F2F2','#1F1F1F',
          ['#0E0E0E','#0E0E0E','#0E0E0E','#0E0E0E','#0E0E0E','#0E0E0E','#0E0E0E'],'#F2F2F2','#7FBF9F',['#F2F2F2','#7FBF9F','#9A9A9A','#6B6B6B','#A9D3BE','#4A4A4A','#D0D0D0','#5E8F76'],'#0E0E0E','dark')),
}
def body(d,skin):
    r=RAD[skin];f=FONT[skin];disp=f[0]+(SERIF if skin in('natural','editorial') else SANS);txt=f[1]+SANS
    L=['--%s:%s'%(k,v) if k!='color-scheme' else 'color-scheme:%s'%v for k,v in d.items()]
    L+=['--f-display:'+disp,'--f-body:'+txt]+['--r-%s:%spx'%(k,v) for k,v in r.items()]
    return ';\n  '.join(L)+';'
out=['/* Identidades visuales de Caoba (generado por tools/identidades.py; no editar a mano).\n   Azul financiero es la predeterminada. Ajustes → Identidad visual cambia data-skin en <html>. */']
for skin,(light,dark) in P.items():
    sel=':root' if skin=='azul' else ':root[data-skin="%s"]'%skin
    if light is None: light=dark
    out.append('%s{\n  %s\n}'%(sel,body(light,skin)))
    out.append('@media (prefers-color-scheme: dark){%s:not([data-theme="light"]){\n  %s\n}}'%(sel if skin!='azul' else ':root:not([data-skin])',body(dark,skin)))
    out.append('%s[data-theme="dark"]{\n  %s\n}'%(sel if skin!='azul' else ':root:not([data-skin])',body(dark,skin)))
pathlib.Path(__file__).resolve().parent.parent.joinpath('src/css/07-identidades.css').write_text('\n'.join(out)+'\n')
print('ok')
