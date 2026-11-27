"""Une src/ en un solo HTML (el mismo que se publica como artefacto y como base de la PWA)."""
import pathlib,sys
R=pathlib.Path(__file__).resolve().parent.parent/'src'
def assemble():
    shell=(R/'shell.html').read_text(encoding='utf-8')
    css=''.join(p.read_text(encoding='utf-8') for p in sorted((R/'css').glob('*.css')))
    js=''.join(p.read_text(encoding='utf-8') for p in sorted((R/'js').glob('*.js')))
    import base64
    FAM={'ibm-plex-sans':'IBM Plex Sans','nunito':'Nunito','manrope':'Manrope','fraunces':'Fraunces','work-sans':'Work Sans','source-serif-4':'Source Serif 4','inter':'Inter'}
    fam=lambda st:FAM[st.split('-latin-')[0]]
    fonts=''.join("@font-face{font-family:'%s';font-style:normal;font-display:swap;font-weight:%s;src:url(data:font/woff2;base64,%s) format('woff2')}\n"%(fam(p.stem),p.stem.split('-')[-2],base64.b64encode(p.read_bytes()).decode()) for p in sorted((R/'fonts').glob('*.woff2')))
    # Las fuentes de las otras identidades se cargan solo si la persona elige esa identidad
    fonts+=''.join("@font-face{font-family:'%s';font-style:normal;font-display:swap;font-weight:%s;src:url(fonts/skins/%s) format('woff2')}\n"%(fam(p.stem),p.stem.split('-')[-2],p.name) for p in sorted((R/'fonts'/'skins').glob('*.woff2')))
    return shell.replace('/*@FONTS*/',fonts,1).replace('/*@CSS*/',css,1).replace('/*@JS*/',js,1)
if __name__=='__main__':
    out=sys.argv[1] if len(sys.argv)>1 else '/home/claude/alcancia.html'
    pathlib.Path(out).write_text(assemble(),encoding='utf-8');print('escrito',out)
